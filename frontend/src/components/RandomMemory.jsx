import React, { useState, useEffect } from 'react';
import { Shuffle, X, Heart, Bookmark, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const API_URL = '/api';

const RandomMemory = ({ onTagClick }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const fetchRandomMemory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/memories/random`);
      setMemory(res.data);
      setIsLiked(res.data.is_liked);
      setIsBookmarked(res.data.is_bookmarked);
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('获取随机记忆失败:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomMemory();
  }, []);

  const handleCopy = () => {
    if (!memory) return;
    const textArea = document.createElement('textarea');
    textArea.value = memory.content;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('复制失败');
    }
    
    document.body.removeChild(textArea);
  };

  const handleLike = async () => {
    if (!user) {
      toast.warning('请先登录');
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/memories/${memory.id}/like`);
      setIsLiked(res.data.liked);
    } catch (err) {
      toast.error('操作失败');
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      toast.warning('请先登录');
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/memories/${memory.id}/bookmark`);
      setIsBookmarked(res.data.bookmarked);
    } catch (err) {
      toast.error('操作失败');
    }
  };

  if (!visible) return null;

  if (!memory && !loading) return null;

  const tags = memory?.tags ? memory.tags.split(',').filter(Boolean) : [];

  return (
    <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shuffle size={18} className="text-primary" />
          <span className="font-medium text-primary">随机回顾</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRandomMemory}
            disabled={loading}
            className="text-sm text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
          >
            <Shuffle size={14} />
            换一条
          </button>
          <button
            onClick={() => setVisible(false)}
            className="p-1 hover:bg-gray-200/50 rounded transition-colors"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="skeleton w-3/4 h-5" />
          <div className="skeleton w-full h-4" />
          <div className="skeleton w-2/3 h-4" />
        </div>
      ) : memory && (
        <>
          <h4 className="font-bold text-dark mb-2">{memory.title}</h4>
          <div className="prose prose-sm max-w-none text-gray-600 text-sm mb-3 line-clamp-3">
            <ReactMarkdown>{memory.content}</ReactMarkdown>
          </div>
          
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => onTagClick && onTagClick(tag)}
                  className="text-xs px-2 py-1 bg-white/50 rounded-full text-gray-500 hover:text-primary hover:bg-white transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 pt-2 border-t border-gray-200/50">
            <span className="text-xs text-gray-400">by {memory.username}</span>
            <div className="flex-1" />
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-white/50 rounded transition-colors text-gray-500"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
            <button
              onClick={handleLike}
              className={`p-1.5 hover:bg-white/50 rounded transition-colors ${isLiked ? 'text-red-500' : 'text-gray-500'}`}
            >
              <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={handleBookmark}
              className={`p-1.5 hover:bg-white/50 rounded transition-colors ${isBookmarked ? 'text-yellow-500' : 'text-gray-500'}`}
            >
              <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default RandomMemory;