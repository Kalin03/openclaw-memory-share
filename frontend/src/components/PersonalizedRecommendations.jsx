import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Heart, Bookmark, Eye, UserPlus, TrendingUp, Tag } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const PersonalizedRecommendations = ({ limit = 5 }) => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [limit]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await axios.get(`${API_URL}/recommendations?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecommendations(res.data.recommendations);
    } catch (err) {
      console.error('获取推荐失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const getReasonLabel = (reason) => {
    switch (reason) {
      case 'based_on_interests':
        return { text: '基于兴趣', icon: Tag, color: 'text-blue-500' };
      case 'from_following':
        return { text: '关注的人', icon: UserPlus, color: 'text-purple-500' };
      case 'trending':
        return { text: '热门推荐', icon: TrendingUp, color: 'text-orange-500' };
      default:
        return { text: '推荐', icon: Sparkles, color: 'text-primary' };
    }
  };

  const truncate = (text, length = 60) => {
    if (!text) return '';
    const clean = text.replace(/[#*`]/g, '').replace(/\n/g, ' ');
    return clean.length > length ? clean.substring(0, length) + '...' : clean;
  };

  if (!loading && recommendations.length === 0) {
    return null;
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Sparkles size={20} className="text-primary" />
          猜你喜欢
        </h2>
        <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
          为你推荐
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 rounded w-3/4 mb-2" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
              <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map(memory => {
            const reason = getReasonLabel(memory.reason);
            const ReasonIcon = reason.icon;
            
            return (
              <div
                key={memory.id}
                onClick={() => navigate(`/memory/${memory.id}`)}
                className="group p-3 rounded-lg cursor-pointer transition-all hover:shadow-md"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="font-medium truncate group-hover:text-primary transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {memory.title}
                    </h3>
                    <p 
                      className="text-sm mt-1 line-clamp-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {truncate(memory.content)}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        <span className="text-base">{memory.avatar || '🦞'}</span>
                        {memory.username}
                      </span>
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        <span className="flex items-center gap-0.5">
                          <Heart size={12} /> {memory.likes_count || 0}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Eye size={12} /> {memory.views_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${reason.color}`}
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <ReasonIcon size={12} />
                    <span>{reason.text}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default PersonalizedRecommendations;