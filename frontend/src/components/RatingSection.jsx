import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, MessageCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const RatingStars = ({ rating, size = 20, interactive = false, onChange }) => {
  const [hovered, setHovered] = useState(0);
  
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange && onChange(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={`${interactive ? 'cursor-pointer' : 'cursor-default'} transition-colors`}
        >
          <Star
            size={size}
            fill={(hovered || rating) >= star ? '#fbbf24' : 'none'}
            stroke={(hovered || rating) >= star ? '#fbbf24' : '#9ca3af'}
            className={interactive ? 'hover:scale-110 transition-transform' : ''}
          />
        </button>
      ))}
    </div>
  );
};

const RatingSection = ({ memoryId }) => {
  const [stats, setStats] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [userRating, setUserRating] = useState(null);
  const [userReview, setUserReview] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReviewInput, setShowReviewInput] = useState(false);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    fetchRatings();
  }, [memoryId]);

  const fetchRatings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/memories/${memoryId}/ratings`);
      setStats(res.data.stats);
      setRatings(res.data.ratings);
      setUserRating(res.data.userRating);
      setUserReview(res.data.userReview || '');
    } catch (error) {
      console.error('获取评分失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (rating) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('请先登录');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/memories/${memoryId}/rate`, 
        { rating, review: reviewText || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserRating(rating);
      fetchRatings();
    } catch (error) {
      console.error('评分失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRating = async () => {
    if (!confirm('确定要删除你的评分吗？')) return;
    
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_URL}/memories/${memoryId}/rate`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserRating(null);
      setReviewText('');
      fetchRatings();
    } catch (error) {
      console.error('删除评分失败:', error);
    }
  };

  const getBarWidth = (count) => {
    if (!stats || stats.total_ratings === 0) return 0;
    return (count / stats.total_ratings) * 100;
  };

  if (loading) {
    return (
      <div className="py-4">
        <div className="animate-pulse flex items-center gap-4">
          <div className="w-24 h-8 bg-gray-200 rounded"></div>
          <div className="flex-1 h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
      <h4 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <Star size={18} className="text-yellow-400" fill="#fbbf24" />
        评分
      </h4>

      {stats && stats.total_ratings > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* 左侧：评分统计 */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {stats.avg_rating?.toFixed(1) || '0.0'}
              </div>
              <div>
                <RatingStars rating={Math.round(stats.avg_rating)} size={24} />
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {stats.total_ratings} 人评分
                </p>
              </div>
            </div>

            {/* 星级分布 */}
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map(star => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs w-4" style={{ color: 'var(--text-secondary)' }}>{star}</span>
                  <Star size={12} fill="#fbbf24" stroke="#fbbf24" />
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <div 
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${getBarWidth(stats[`${['one','two','three','four','five'][star-1]}_star`])}%` }}
                    ></div>
                  </div>
                  <span className="text-xs w-8 text-right" style={{ color: 'var(--text-secondary)' }}>
                    {stats[`${['one','two','three','four','five'][star-1]}_star`]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧：用户评分 */}
          <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              {userRating ? '你的评分' : '为此记忆评分'}
            </p>
            <div className="flex items-center gap-2 mb-3">
              <RatingStars 
                rating={userRating || 0} 
                size={28} 
                interactive={true} 
                onChange={handleRate}
              />
              {submitting && <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>保存中...</span>}
            </div>
            
            {userRating && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowReviewInput(!showReviewInput)}
                  className="text-sm text-primary hover:underline"
                >
                  {userReview || reviewText ? '编辑评论' : '添加评论'}
                </button>
                <button
                  onClick={handleDeleteRating}
                  className="text-sm ml-4 hover:underline"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  删除评分
                </button>
              </div>
            )}
            
            {showReviewInput && (
              <div className="mt-3">
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="写下你的评价..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    borderColor: 'var(--border-color)', 
                    color: 'var(--text-primary)' 
                  }}
                  rows={3}
                />
                <button
                  onClick={() => handleRate(userRating)}
                  className="mt-2 px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90"
                >
                  保存评论
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="mb-3" style={{ color: 'var(--text-secondary)' }}>暂无评分，成为第一个评分的人吧！</p>
          <RatingStars rating={userRating || 0} size={32} interactive={true} onChange={handleRate} />
        </div>
      )}

      {/* 评价列表 */}
      {ratings.length > 0 && (
        <div className="mt-6">
          <h5 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            评价 ({stats?.total_ratings || 0})
          </h5>
          <div className="space-y-3">
            {ratings.slice(0, 5).map(rating => (
              <div 
                key={rating.id} 
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{rating.avatar || '🦞'}</span>
                  <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    {rating.username}
                  </span>
                  <RatingStars rating={rating.rating} size={14} />
                </div>
                {rating.review && (
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {rating.review}
                  </p>
                )}
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(rating.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RatingSection;