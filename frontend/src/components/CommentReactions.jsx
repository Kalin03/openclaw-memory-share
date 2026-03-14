import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = '/api';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];

const CommentReactions = ({ commentId }) => {
  const [reactions, setReactions] = useState({});
  const [userReactions, setUserReactions] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchReactions();
  }, [commentId]);

  const fetchReactions = async () => {
    try {
      const res = await axios.get(`${API_URL}/comments/${commentId}/reactions`);
      setReactions(res.data.reactions);
      
      // 如果已登录，获取用户反应
      if (token) {
        const userRes = await axios.get(`${API_URL}/comments/${commentId}/reactions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // 用户反应需要额外API或从评论详情获取
      }
    } catch (err) {
      console.error('获取反应失败:', err);
    }
  };

  const handleReaction = async (emoji) => {
    if (!token) {
      alert('请先登录');
      return;
    }

    try {
      const res = await axios.post(
        `${API_URL}/comments/${commentId}/reactions`,
        { emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setReactions(res.data.reactions);
      setUserReactions(res.data.userReactions);
      setShowPicker(false);
    } catch (err) {
      console.error('添加反应失败:', err);
    }
  };

  const totalReactions = Object.values(reactions).reduce((sum, count) => sum + count, 0);

  return (
    <div className="relative inline-block">
      {/* 已有反应显示 */}
      {Object.entries(reactions).length > 0 && (
        <div className="flex items-center gap-1 mr-2">
          {Object.entries(reactions).map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all ${
                userReactions.includes(emoji)
                  ? 'bg-primary/20 ring-1 ring-primary'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              style={{ backgroundColor: userReactions.includes(emoji) ? undefined : 'var(--bg-tertiary)' }}
            >
              <span>{emoji}</span>
              {count > 1 && <span style={{ color: 'var(--text-secondary)' }}>{count}</span>}
            </button>
          ))}
        </div>
      )}

      {/* 添加反应按钮 */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="text-xs px-2 py-1 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}
      >
        {totalReactions > 0 ? '😀' : '😊'}
      </button>

      {/* 表情选择器 */}
      {showPicker && (
        <div 
          className="absolute left-0 top-8 z-10 p-2 rounded-lg shadow-lg flex gap-1"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
        >
          {EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-transform hover:scale-125 ${
                userReactions.includes(emoji) ? 'bg-primary/20' : ''
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentReactions;