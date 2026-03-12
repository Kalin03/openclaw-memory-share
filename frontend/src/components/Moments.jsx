import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Trash2, Image, X, Send, Hash, ChevronLeft } from 'lucide-react';

const Moments = ({ user, onBack }) => {
  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState(null);
  const [hotTopics, setHotTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const observerRef = useRef(null);

  // 获取热门话题
  useEffect(() => {
    const fetchHotTopics = async () => {
      try {
        const res = await fetch('/api/moments/topics/hot?limit=10');
        const data = await res.json();
        setHotTopics(data);
      } catch (error) {
        console.error('获取热门话题失败:', error);
      }
    };
    fetchHotTopics();
  }, []);

  // 获取沸点列表
  const fetchMoments = async (pageNum = 1, topic = null) => {
    setLoading(true);
    try {
      let url = `/api/moments?page=${pageNum}&limit=10`;
      if (topic) {
        url += `&topic=${encodeURIComponent(topic)}`;
      }

      const headers = {};
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, { headers });
      const data = await res.json();

      if (pageNum === 1) {
        setMoments(data.moments);
      } else {
        setMoments(prev => [...prev, ...data.moments]);
      }

      setHasMore(data.pagination.page < data.pagination.totalPages);
    } catch (error) {
      console.error('获取沸点失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoments(1, selectedTopic);
  }, [selectedTopic]);

  // 无限滚动
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchMoments(nextPage, selectedTopic);
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, page, selectedTopic]);

  // 点赞沸点
  const handleLike = async (momentId, isLiked) => {
    if (!user) {
      alert('请先登录');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const method = isLiked ? 'DELETE' : 'POST';
      
      const res = await fetch(`/api/moments/${momentId}/like`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setMoments(prev => prev.map(m => 
          m.id === momentId 
            ? { ...m, is_liked: !isLiked, likes_count: data.likes_count } 
            : m
        ));
      }
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  // 删除沸点
  const handleDelete = async (momentId) => {
    if (!confirm('确定要删除这条沸点吗？')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/moments/${momentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setMoments(prev => prev.filter(m => m.id !== momentId));
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  // 格式化时间
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 解析话题标签
  const parseTopics = (topicsStr) => {
    if (!topicsStr) return [];
    return topicsStr.split(',').filter(Boolean).map(t => t.trim());
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* 头部 */}
      <div className="sticky top-0 z-10 border-b px-4 py-3" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-1 rounded hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
                <ChevronLeft size={24} />
              </button>
            )}
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>🔥 沸点</h1>
          </div>
          {user && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              发布沸点
            </button>
          )}
        </div>
      </div>

      {/* 热门话题 */}
      {hotTopics.length > 0 && (
        <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border-color)' }}>
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <span className="text-sm flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>热门话题:</span>
              <button
                onClick={() => setSelectedTopic(null)}
                className={`px-3 py-1 rounded-full text-sm flex-shrink-0 transition-all ${
                  selectedTopic === null ? 'text-white' : ''
                }`}
                style={{
                  backgroundColor: selectedTopic === null ? 'var(--primary)' : 'var(--bg-tertiary)',
                  color: selectedTopic === null ? 'white' : 'var(--text-secondary)'
                }}
              >
                全部
              </button>
              {hotTopics.map(topic => (
                <button
                  key={topic.name}
                  onClick={() => setSelectedTopic(topic.name)}
                  className={`px-3 py-1 rounded-full text-sm flex-shrink-0 transition-all ${
                    selectedTopic === topic.name ? 'text-white' : ''
                  }`}
                  style={{
                    backgroundColor: selectedTopic === topic.name ? 'var(--primary)' : 'var(--bg-tertiary)',
                    color: selectedTopic === topic.name ? 'white' : 'var(--text-secondary)'
                  }}
                >
                  #{topic.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 沸点列表 */}
      <div className="max-w-2xl mx-auto">
        {moments.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--text-secondary)' }}>
            <p className="text-lg">暂无沸点</p>
            {user && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                发布第一条沸点
              </button>
            )}
          </div>
        )}

        {moments.map(moment => (
          <MomentCard
            key={moment.id}
            moment={moment}
            user={user}
            onLike={handleLike}
            onDelete={handleDelete}
            onViewDetail={() => setSelectedMoment(moment)}
            formatTime={formatTime}
            parseTopics={parseTopics}
          />
        ))}

        {/* 加载更多 */}
        <div ref={observerRef} className="py-4">
          {loading && (
            <div className="flex justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
      </div>

      {/* 创建沸点弹窗 */}
      {showCreateModal && (
        <CreateMomentModal
          user={user}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newMoment) => {
            setMoments(prev => [newMoment, ...prev]);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* 沸点详情弹窗 */}
      {selectedMoment && (
        <MomentDetailModal
          moment={selectedMoment}
          user={user}
          onClose={() => setSelectedMoment(null)}
          formatTime={formatTime}
          parseTopics={parseTopics}
        />
      )}
    </div>
  );
};

// 沸点卡片组件
const MomentCard = ({ moment, user, onLike, onDelete, onViewDetail, formatTime, parseTopics }) => {
  const topics = parseTopics(moment.topics);
  const images = moment.images ? moment.images.split(',').filter(Boolean) : [];

  return (
    <div className="border-b px-4 py-4 transition-colors hover:opacity-95" style={{ borderColor: 'var(--border-color)' }}>
      {/* 用户信息 */}
      <div className="flex items-start gap-3">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          {moment.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{moment.username}</span>
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{formatTime(moment.created_at)}</span>
          </div>

          {/* 内容 */}
          <div 
            className="mt-2 cursor-pointer" 
            onClick={onViewDetail}
          >
            <p style={{ color: 'var(--text-primary)' }}>{moment.content}</p>
          </div>

          {/* 话题 */}
          {topics.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {topics.map(topic => (
                <span key={topic} className="text-sm text-primary">#{topic}</span>
              ))}
            </div>
          )}

          {/* 图片 */}
          {images.length > 0 && (
            <div className={`grid gap-2 mt-3 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {images.slice(0, 9).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt=""
                  className="rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  style={{
                    aspectRatio: images.length === 1 ? '16/9' : '1/1',
                    maxHeight: images.length === 1 ? '300px' : '120px'
                  }}
                  onClick={onViewDetail}
                />
              ))}
            </div>
          )}

          {/* 操作栏 */}
          <div className="flex items-center gap-6 mt-3">
            <button
              onClick={() => onLike(moment.id, moment.is_liked)}
              className="flex items-center gap-1 transition-colors"
              style={{ color: moment.is_liked ? 'var(--primary)' : 'var(--text-secondary)' }}
            >
              <Heart size={18} fill={moment.is_liked ? 'currentColor' : 'none'} />
              <span className="text-sm">{moment.likes_count || 0}</span>
            </button>
            <button
              onClick={onViewDetail}
              className="flex items-center gap-1 transition-colors hover:text-primary"
              style={{ color: 'var(--text-secondary)' }}
            >
              <MessageCircle size={18} />
              <span className="text-sm">{moment.comments_count || 0}</span>
            </button>
            {user && user.id === moment.user_id && (
              <button
                onClick={() => onDelete(moment.id)}
                className="flex items-center gap-1 transition-colors hover:text-red-500"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 创建沸点弹窗
const CreateMomentModal = ({ user, onClose, onSuccess }) => {
  const [content, setContent] = useState('');
  const [topics, setTopics] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('content', content.trim());
      formData.append('topics', topics.trim());

      images.forEach((img, idx) => {
        formData.append('images', img);
      });

      const res = await fetch('/api/moments', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        onSuccess(data);
      } else {
        alert(data.error || '发布失败');
      }
    } catch (error) {
      console.error('发布沸点失败:', error);
      alert('发布失败');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const remaining = 9 - images.length;
    const toAdd = files.slice(0, remaining);
    setImages(prev => [...prev, ...toAdd]);
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  // 从内容中提取话题
  const extractTopics = (text) => {
    const topicRegex = /#(\S+)/g;
    const matches = [];
    let match;
    while ((match = topicRegex.exec(text)) !== null) {
      matches.push(match[1]);
    }
    return matches.join(',');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div 
        className="w-full max-w-lg rounded-lg shadow-xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>发布沸点</h3>
          <button onClick={onClose} className="p-1 rounded hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-4">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setTopics(extractTopics(e.target.value));
            }}
            placeholder="分享你的想法... 使用 #话题 添加话题标签"
            className="w-full h-32 p-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)'
            }}
            maxLength={500}
          />
          <div className="text-right mt-1">
            <span className="text-sm" style={{ color: content.length > 450 ? 'var(--primary)' : 'var(--text-tertiary)' }}>
              {content.length}/500
            </span>
          </div>

          {/* 图片预览 */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={URL.createObjectURL(img)}
                    alt=""
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 工具栏 */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 9}
                className="p-2 rounded-lg transition-colors disabled:opacity-50"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Image size={20} />
              </button>
              <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {images.length}/9
              </span>
            </div>

            <button
              type="submit"
              disabled={!content.trim() || loading}
              className="px-4 py-2 rounded-lg text-white font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {loading ? '发布中...' : '发布'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 沸点详情弹窗
const MomentDetailModal = ({ moment: initialMoment, user, onClose, formatTime, parseTopics }) => {
  const [moment, setMoment] = useState(initialMoment);
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState('');
  const [loading, setLoading] = useState(true);
  const topics = parseTopics(moment.topics);
  const images = moment.images ? moment.images.split(',').filter(Boolean) : [];

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/moments/${moment.id}/comments`);
        const data = await res.json();
        setComments(data);
      } catch (error) {
        console.error('获取评论失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [moment.id]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentContent.trim() || !user) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/moments/${moment.id}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: commentContent.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        setComments(prev => [data, ...prev]);
        setCommentContent('');
        setMoment(prev => ({ ...prev, comments_count: (prev.comments_count || 0) + 1 }));
      }
    } catch (error) {
      console.error('添加评论失败:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      alert('请先登录');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const method = moment.is_liked ? 'DELETE' : 'POST';
      
      const res = await fetch(`/api/moments/${moment.id}/like`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setMoment(prev => ({ 
          ...prev, 
          is_liked: !prev.is_liked, 
          likes_count: data.likes_count 
        }));
      }
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div 
        className="w-full max-w-lg max-h-[90vh] rounded-lg shadow-xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>沸点详情</h3>
          <button onClick={onClose} className="p-1 rounded hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {/* 用户信息 */}
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                {moment.avatar}
              </div>
              <div>
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{moment.username}</div>
                <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{formatTime(moment.created_at)}</div>
              </div>
            </div>

            {/* 内容 */}
            <p className="mt-3" style={{ color: 'var(--text-primary)' }}>{moment.content}</p>

            {/* 话题 */}
            {topics.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {topics.map(topic => (
                  <span key={topic} className="text-sm text-primary">#{topic}</span>
                ))}
              </div>
            )}

            {/* 图片 */}
            {images.length > 0 && (
              <div className={`grid gap-2 mt-3 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt=""
                    className="rounded-lg object-cover"
                    style={{
                      aspectRatio: images.length === 1 ? '16/9' : '1/1',
                      maxHeight: images.length === 1 ? '300px' : '120px'
                    }}
                  />
                ))}
              </div>
            )}

            {/* 点赞 */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button
                onClick={handleLike}
                className="flex items-center gap-1 transition-colors"
                style={{ color: moment.is_liked ? 'var(--primary)' : 'var(--text-secondary)' }}
              >
                <Heart size={20} fill={moment.is_liked ? 'currentColor' : 'none'} />
                <span>{moment.likes_count || 0}</span>
              </button>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {moment.comments_count || 0} 条评论
              </span>
            </div>
          </div>

          {/* 评论列表 */}
          <div className="border-t" style={{ borderColor: 'var(--border-color)' }}>
            <div className="p-4">
              <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>评论</h4>
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center py-4" style={{ color: 'var(--text-secondary)' }}>暂无评论</p>
              ) : (
                <div className="space-y-4">
                  {comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                        style={{ backgroundColor: 'var(--bg-tertiary)' }}
                      >
                        {comment.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{comment.username}</span>
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatTime(comment.created_at)}</span>
                        </div>
                        <p className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 评论输入 */}
        {user && (
          <form onSubmit={handleAddComment} className="p-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex gap-2">
              <input
                type="text"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="写下你的评论..."
                className="flex-1 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  color: 'var(--text-primary)'
                }}
                maxLength={200}
              />
              <button
                type="submit"
                disabled={!commentContent.trim()}
                className="px-4 py-2 rounded-lg text-white font-medium transition-all disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Moments;