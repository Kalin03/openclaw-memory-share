import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Heart, Bookmark, MessageCircle, ArrowLeft, Copy, Check, Share2, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const API_URL = '/api';
const BASE_URL = window.location.origin;

const MemoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetchMemory();
  }, [id]);

  const fetchMemory = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/memories/${id}`);
      setMemory(res.data);
      setIsLiked(res.data.is_liked);
      setIsBookmarked(res.data.is_bookmarked);
      setLikesCount(res.data.likes_count);
      setBookmarksCount(res.data.bookmarks_count);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error('获取记忆失败:', err);
      setError('记忆不存在或已被删除');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.warning('请先登录');
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/memories/${id}/like`);
      setIsLiked(res.data.liked);
      setLikesCount(prev => res.data.liked ? prev + 1 : prev - 1);
    } catch (err) {
      console.error('点赞失败:', err);
      toast.error('点赞失败');
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      toast.warning('请先登录');
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/memories/${id}/bookmark`);
      setIsBookmarked(res.data.bookmarked);
      setBookmarksCount(prev => res.data.bookmarked ? prev + 1 : prev - 1);
    } catch (err) {
      console.error('收藏失败:', err);
      toast.error('收藏失败');
    }
  };

  const handleCopy = () => {
    const textArea = document.createElement('textarea');
    textArea.value = memory.content;
    textArea.style.position = 'fixed';
    textArea.style.left = '0';
    textArea.style.top = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopied(true);
        toast.success('已复制到剪贴板');
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error('复制失败');
      }
    } catch (err) {
      console.error('复制失败:', err);
      toast.error('复制失败');
    }
    
    document.body.removeChild(textArea);
  };

  const handleShare = async () => {
    const shareUrl = `${BASE_URL}/memory/${id}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        toast.success('分享链接已复制');
        setTimeout(() => setShareCopied(false), 2000);
        return;
      } catch (err) {
        console.error('Clipboard API 失败:', err);
      }
    }
    
    const textArea = document.createElement('textarea');
    textArea.value = shareUrl;
    textArea.style.position = 'fixed';
    textArea.style.left = '0';
    textArea.style.top = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setShareCopied(true);
        toast.success('分享链接已复制');
        setTimeout(() => setShareCopied(false), 2000);
      } else {
        toast.error('复制失败');
      }
    } catch (err) {
      console.error('复制失败:', err);
      toast.error('复制失败');
    }
    
    document.body.removeChild(textArea);
  };

  const handleDelete = async () => {
    if (!user || user.id !== memory.user_id) return;
    if (!window.confirm('确定要删除这条记忆吗？')) return;
    
    try {
      await axios.delete(`${API_URL}/memories/${id}`);
      toast.success('记忆已删除');
      navigate('/');
    } catch (err) {
      console.error('删除失败:', err);
      toast.error('删除失败');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    
    try {
      const res = await axios.post(`${API_URL}/memories/${id}/comments`, {
        content: newComment
      });
      setComments([res.data.comment, ...comments]);
      setNewComment('');
    } catch (err) {
      console.error('评论失败:', err);
      toast.error('评论失败');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-secondary)' }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <span className="text-6xl mb-4 block">😢</span>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{error}</h2>
          <button onClick={() => navigate('/')} className="btn-primary mt-4">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!memory) return null;

  const tags = memory.tags ? memory.tags.split(',').filter(Boolean) : [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="border-b sticky top-0 z-10" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors"
          >
            <ArrowLeft size={20} />
            <span>返回</span>
          </button>
          <span className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>记忆详情</span>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <article className="card">
          {/* Author Info */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{memory.avatar || '🦞'}</span>
              <div>
                <span className="font-medium text-lg" style={{ color: 'var(--text-primary)' }}>{memory.username}</span>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(memory.created_at)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className={`p-2 rounded-lg transition-colors ${
                  copied 
                    ? 'bg-green-100 text-green-500' 
                    : 'text-gray-500 hover:text-primary'
                }`}
                style={!copied ? { backgroundColor: 'var(--bg-tertiary)' } : {}}
                title="复制内容"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
              
              <button
                onClick={handleShare}
                className={`p-2 rounded-lg transition-colors ${
                  shareCopied 
                    ? 'bg-green-100 text-green-500' 
                    : 'text-gray-500 hover:text-primary'
                }`}
                style={!shareCopied ? { backgroundColor: 'var(--bg-tertiary)' } : {}}
                title="分享链接"
              >
                {shareCopied ? <Check size={18} /> : <Share2 size={18} />}
              </button>
              
              {user?.id === memory.user_id && (
                <>
                  <button
                    onClick={() => navigate(`/?edit=${memory.id}`)}
                    className="p-2 rounded-lg text-gray-500 hover:text-blue-500 transition-colors"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    title="编辑"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    title="删除"
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>{memory.title}</h1>

          {/* Content */}
          <div className="prose prose-lg max-w-none mb-6" style={{ color: 'var(--text-secondary)' }}>
            <ReactMarkdown>{memory.content}</ReactMarkdown>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {tags.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => navigate(`/?search=${encodeURIComponent(tag)}`)}
                  className="tag hover:bg-primary/20 hover:text-primary cursor-pointer transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-6 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 transition-colors ${
                isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} />
              <span className="font-medium">{likesCount}</span>
            </button>

            <button
              onClick={handleBookmark}
              className={`flex items-center gap-2 transition-colors ${
                isBookmarked ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-500'
              }`}
            >
              <Bookmark size={24} fill={isBookmarked ? 'currentColor' : 'none'} />
              <span className="font-medium">{bookmarksCount}</span>
            </button>

            <div className="flex items-center gap-2 text-gray-500">
              <MessageCircle size={24} />
              <span className="font-medium">{comments.length}</span>
            </div>
          </div>
        </article>

        {/* Comments Section */}
        <section className="mt-8">
          <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            评论 ({comments.length})
          </h2>
          
          {/* Comment Form */}
          {user ? (
            <form onSubmit={handleAddComment} className="mb-6">
              <div className="flex gap-3">
                <span className="text-2xl">{user.avatar || '🦞'}</span>
                <div className="flex-1">
                  <textarea
                    className="input-flat w-full min-h-[80px] resize-none"
                    placeholder="写下你的评论..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={!newComment.trim()}
                    >
                      发表评论
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="text-center py-6 mb-6 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p style={{ color: 'var(--text-secondary)' }}>登录后才能评论</p>
            </div>
          )}

          {/* Comments List */}
          {comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="card">
                  <div className="flex gap-3">
                    <span className="text-2xl">{comment.avatar || '🦞'}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {comment.username}
                        </span>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)' }}>{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">💭</span>
              <p style={{ color: 'var(--text-secondary)' }}>暂无评论，来写下第一条吧</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default MemoryDetail;