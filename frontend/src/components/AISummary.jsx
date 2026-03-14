import React, { useState } from 'react';
import { Sparkles, Copy, Check, Loader2, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const AISummary = ({ content, title }) => {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const generateSummary = async () => {
    if (!content) return;
    
    setLoading(true);
    setError('');
    
    try {
      // 使用简单的本地摘要算法（提取关键句子）
      const sentences = content
        .replace(/[#*`]/g, '')
        .replace(/\n+/g, ' ')
        .split(/[。！？.!?]/)
        .filter(s => s.trim().length > 10);
      
      if (sentences.length === 0) {
        setSummary('内容较短，无需摘要。');
        setLoading(false);
        return;
      }

      // 简单的关键词权重算法
      const wordFreq = {};
      const stopWords = new Set(['的', '是', '在', '了', '和', '与', '或', '这', '那', '有', '为', '以', '及', '等', '中', '上', '下', '不', '人', '都', '一', '一个', '我们', '你们', '他们', '它们', '可以', '这个', '那个', '什么', '怎么', '如何', '为什么', '因为', '所以', '但是', '然而', '如果', '虽然', '而且', '或者', '以及', '不是', '没有', '已经', '正在', '将要', '应该', '需要', '可能', '能够', '进行', '实现', '使用', '通过', '关于', '对于', '根据', '按照', '由于', '为了', '从', '到', '把', '被', '让', '给', '向', '对', '跟', '比', '最', '更', '很', '非常', '比较', '相当', '特别', '尤其', '甚至', '仍然', '一直', '总是', '从来', '曾经', '已经', '正在', '将要']);
      
      sentences.forEach(s => {
        const words = s.split(/\s+|(?=[\u4e00-\u9fa5])|(?<=[\u4e00-\u9fa5])/).filter(w => w.length > 1 && !stopWords.has(w));
        words.forEach(w => {
          wordFreq[w] = (wordFreq[w] || 0) + 1;
        });
      });

      // 计算句子得分
      const sentenceScores = sentences.map(s => {
        const words = s.split(/\s+|(?=[\u4e00-\u9fa5])|(?<=[\u4e00-\u9fa5])/).filter(w => w.length > 1);
        const score = words.reduce((sum, w) => sum + (wordFreq[w] || 0), 0);
        return { sentence: s.trim(), score };
      });

      // 选择得分最高的句子
      sentenceScores.sort((a, b) => b.score - a.score);
      
      const topSentences = sentenceScores.slice(0, 3).map(s => s.sentence);
      const generatedSummary = `📝 内容摘要：\n\n${topSentences.map((s, i) => `${i + 1}. ${s}。`).join('\n')}`;
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setSummary(generatedSummary);
    } catch (err) {
      console.error('生成摘要失败:', err);
      setError('生成摘要失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary.replace(/📝 内容摘要：\n\n/, '').replace(/\n/g, ' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="rounded-lg p-4"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
            AI 智能摘要
          </span>
        </div>
        {summary && (
          <div className="flex items-center gap-2">
            <button
              onClick={generateSummary}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="重新生成"
            >
              <RefreshCw size={16} style={{ color: 'var(--text-secondary)' }} />
            </button>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="复制摘要"
            >
              {copied ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <Copy size={16} style={{ color: 'var(--text-secondary)' }} />
              )}
            </button>
          </div>
        )}
      </div>

      {!summary && !loading && (
        <button
          onClick={generateSummary}
          className="w-full py-2.5 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles size={16} />
          <span>生成摘要</span>
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center py-6 gap-2">
          <Loader2 size={20} className="animate-spin text-primary" />
          <span style={{ color: 'var(--text-secondary)' }}>正在分析内容...</span>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-sm py-2">{error}</div>
      )}

      {summary && !loading && (
        <div 
          className="text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--text-secondary)' }}
        >
          {summary}
        </div>
      )}
    </div>
  );
};

export default AISummary;