import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const FeedbackButtons = ({ memoryId }) => {
  const [stats, setStats] = useState({ total: 0, helpfulCount: 0, notHelpfulCount: 0, helpfulRate: 0 });
  const [userFeedback, setUserFeedback] = useState({ hasFeedback: false, isHelpful: null });
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchUserFeedback();
  }, [memoryId]);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/memories/${memoryId}/feedback`);
      setStats(res.data);
    } catch (err) {
      // Ignore errors
    }
  };

  const fetchUserFeedback = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const res = await axios.get(`${API_URL}/memories/${memoryId}/feedback/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserFeedback(res.data);
      if (res.data.feedback) {
        setFeedbackText(res.data.feedback);
      }
    } catch (err) {
      // Ignore errors
    }
  };

  const handleFeedback = async (isHelpful) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('请先登录');
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${API_URL}/memories/${memoryId}/feedback`,
        { isHelpful, feedback: feedbackText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setUserFeedback({ hasFeedback: true, isHelpful });
      fetchStats();
      setShowFeedbackInput(false);
    } catch (err) {
      console.error('提交反馈失败:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feedback-section">
      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        <span 
          className="text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          {stats.total > 0 ? (
            <>
              <span className="text-green-500 font-medium">{stats.helpfulRate}%</span> 认为有帮助
              <span className="mx-2">·</span>
              {stats.total} 人评价
            </>
          ) : (
            '暂无评价'
          )}
        </span>
      </div>

      {/* Feedback Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleFeedback(true)}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            userFeedback.isHelpful === true
              ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
              : 'hover:bg-green-50 text-gray-600 dark:hover:bg-green-900/20'
          }`}
          style={!userFeedback.isHelpful ? { backgroundColor: 'var(--bg-tertiary)' } : {}}
        >
          <ThumbsUp 
            size={18} 
            fill={userFeedback.isHelpful === true ? 'currentColor' : 'none'}
          />
          <span className="text-sm font-medium">有帮助</span>
          {stats.helpfulCount > 0 && (
            <span className="text-xs opacity-70">{stats.helpfulCount}</span>
          )}
        </button>

        <button
          onClick={() => handleFeedback(false)}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            userFeedback.isHelpful === false
              ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
              : 'hover:bg-red-50 text-gray-600 dark:hover:bg-red-900/20'
          }`}
          style={!userFeedback.isHelpful && userFeedback.isHelpful !== false ? { backgroundColor: 'var(--bg-tertiary)' } : {}}
        >
          <ThumbsDown 
            size={18} 
            fill={userFeedback.isHelpful === false ? 'currentColor' : 'none'}
          />
          <span className="text-sm font-medium">没帮助</span>
          {stats.notHelpfulCount > 0 && (
            <span className="text-xs opacity-70">{stats.notHelpfulCount}</span>
          )}
        </button>

        <button
          onClick={() => setShowFeedbackInput(!showFeedbackInput)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            showFeedbackInput ? 'bg-primary/10 text-primary' : ''
          }`}
          style={!showFeedbackInput ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : {}}
          title="添加反馈说明"
        >
          <MessageCircle size={16} />
        </button>
      </div>

      {/* Feedback Input */}
      {showFeedbackInput && (
        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="告诉我们您的具体建议..."
            className="w-full p-3 rounded-lg resize-none"
            style={{ 
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }}
            rows={3}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setShowFeedbackInput(false)}
              className="px-3 py-1.5 text-sm rounded-lg"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              取消
            </button>
            <button
              onClick={() => userFeedback.isHelpful !== null && handleFeedback(userFeedback.isHelpful)}
              disabled={loading || userFeedback.isHelpful === null}
              className="px-3 py-1.5 text-sm rounded-lg bg-primary text-white"
            >
              提交
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackButtons;