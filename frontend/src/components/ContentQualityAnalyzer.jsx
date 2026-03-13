import React, { useState, useEffect } from 'react';
import { X, BarChart2, Lightbulb, TrendingUp, AlertCircle, CheckCircle, FileText, Tag, Hash } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const ContentQualityAnalyzer = ({ memoryId, title, content, tags, onClose }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeContent();
  }, [memoryId]);

  const analyzeContent = async () => {
    setLoading(true);
    try {
      let res;
      if (memoryId) {
        res = await axios.get(`${API_URL}/memories/${memoryId}/analyze`);
      } else {
        const token = localStorage.getItem('token');
        res = await axios.post(`${API_URL}/memories/analyze`, 
          { title, content, tags },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setAnalysis(res.data);
    } catch (error) {
      console.error('分析失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
    if (score >= 40) return 'bg-orange-100 dark:bg-orange-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div 
          className="rounded-xl p-8"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-center" style={{ color: 'var(--text-secondary)' }}>正在分析内容质量...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div 
          className="rounded-xl p-8"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          <p style={{ color: 'var(--text-secondary)' }}>分析失败</p>
          <button onClick={onClose} className="mt-4 btn-primary w-full">关闭</button>
        </div>
      </div>
    );
  }

  const { quality, summary, keywords } = analysis;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <BarChart2 size={24} className="text-primary" />
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>内容质量分析</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Overall Score */}
          <div className={`p-6 rounded-xl text-center ${getScoreBg(quality.score)}`}>
            <div className={`text-5xl font-bold ${getScoreColor(quality.score)}`}>
              {quality.score}
              <span className="text-2xl">/{quality.maxScore}</span>
            </div>
            <p className="mt-2 text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
              {quality.score >= 80 ? '优秀' : quality.score >= 60 ? '良好' : quality.score >= 40 ? '一般' : '需要改进'}
            </p>
          </div>

          {/* Score Breakdown */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>评分详情</h3>
            <div className="space-y-3">
              {[
                { key: 'title', label: '标题质量', icon: FileText },
                { key: 'length', label: '内容长度', icon: TrendingUp },
                { key: 'structure', label: '内容结构', icon: BarChart2 },
                { key: 'tags', label: '标签质量', icon: Tag },
                { key: 'readability', label: '可读性', icon: CheckCircle },
                { key: 'media', label: '多媒体丰富', icon: AlertCircle }
              ].map(item => {
                const data = quality.breakdown[item.key];
                if (!data) return null;
                const Icon = item.icon;
                const percentage = (data.score / data.maxScore) * 100;
                
                return (
                  <div key={item.key} className="flex items-center gap-4">
                    <div className="w-32 flex items-center gap-2">
                      <Icon size={16} style={{ color: 'var(--text-secondary)' }} />
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                    </div>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <div 
                        className={`h-full rounded-full transition-all ${
                          percentage >= 80 ? 'bg-green-500' : 
                          percentage >= 60 ? 'bg-yellow-500' : 
                          percentage >= 40 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="w-12 text-sm text-right" style={{ color: 'var(--text-secondary)' }}>
                      {data.score}/{data.maxScore}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>内容摘要</h3>
              <p className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                {summary}
              </p>
            </div>
          )}

          {/* Keywords */}
          {keywords && keywords.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>关键词</h3>
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword, index) => (
                  <span 
                    key={index}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  >
                    <Hash size={12} />
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {quality.suggestions && quality.suggestions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Lightbulb size={18} className="text-yellow-500" />
                改进建议
              </h3>
              <div className="space-y-2">
                {quality.suggestions.map((suggestion, index) => (
                  <div 
                    key={index}
                    className="p-3 rounded-lg border"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                  >
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <button onClick={onClose} className="btn-primary w-full">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentQualityAnalyzer;