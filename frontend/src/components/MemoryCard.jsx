import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Heart, Bookmark, MessageCircle, Copy, Trash2, Check, Edit2, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const API_URL = '/api';
const BASE_URL = window.location.origin;

const MemoryCard = ({ memory, onDelete, onEdit, onTagClick }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [isLiked, setIsLiked] = useState(memory.is_liked);
  const [isBookmarked, setIsBookmarked] = useState(memory.is_bookmarked);
  const [likesCount, setLikesCount] = useState(memory.likes_count);
  const [bookmarksCount, setBookmarksCount] = useState(memory.bookmarks_count);
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [shareCopied, setShareCopied] = useState(false);

  const handleCopy = () => {
    // 使用传统方法确保兼容性
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
        setShowToast(true);
        setTimeout(() => {
          setCopied(false);
          setShowToast(false);
        }, 2000);
      } else {
        toast.error('复制失败，请手动选择文本复制');
      }
    } catch (err) {
      console.error('复制失败:', err);
      toast.error('复制失败，请手动选择文本复制');
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
      const res = await axios.post(`${API_URL}/memories/${memory.id}/bookmark`);
      setIsBookmarked(res.data.bookmarked);
      setBookmarksCount(prev => res.data.bookmarked ? prev + 1 : prev - 1);
    } catch (err) {
      console.error('收藏失败:', err);
      toast.error('收藏失败');
    }
  };

  const handleShare = async () => {
    const shareUrl = `${BASE_URL}/memory/${memory.id}`;
    
    // 尝试使用现代 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        toast.success('分享链接已复制到剪贴板');
        setTimeout(() => setShareCopied(false), 2000);
        return;
      } catch (err) {
        console.error('Clipboard API 失败:', err);
      }
    }
    
    // 降级使用传统方法
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
        toast.success('分享链接已复制到剪贴板');
        setTimeout(() => setShareCopied(false), 2000);
      } else {
        toast.error('复制失败，请手动复制链接');
      }
    } catch (err) {
      console.error('复制失败:', err);
      toast.error('复制失败，请手动复制链接');
    }
    
    document.body.removeChild(textArea);
  };

  const handleShowComments = async () => {
    if (!showComments) {
      try {
        const res = await axios.get(`${API_URL}/memories/${memory.id}`);
        setComments(res.data.comments || []);
      } catch (err) {
        console.error('获取评论失败:', err);
      }
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    
    try {
      const res = await axios.post(`${API_URL}/memories/${memory.id}/comments`, {
        content: newComment
      });
      setComments([res.data.comment, ...comments]);
      setNewComment('');
    } catch (err) {
      console.error('评论失败:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const tags = memory.tags ? memory.tags.split(',').filter(Boolean) : [];

  return (
    <div className="card relative">
      {/* Toast提示 */}
      {showToast && (
        <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-medium z-10 animate-pulse">
          ✅ 已复制到剪贴板
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{memory.avatar || '🦞'}</span>
          <div>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{memory.username}</span>
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
                onClick={() => onEdit && onEdit(memory)}
                className="p-2 rounded-lg text-gray-500 hover:text-blue-500 transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
                title="编辑"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => onDelete(memory.id)}
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
      <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{memory.title}</h3>

      {/* Content */}
      <div className="prose prose-sm max-w-none mb-4" style={{ color: 'var(--text-secondary)' }}>
        <ReactMarkdown>{memory.content}</ReactMarkdown>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, index) => (
            <button
              key={index}
              onClick={() => onTagClick && onTagClick(tag)}
              className="tag hover:bg-primary/20 hover:text-primary cursor-pointer transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 transition-colors ${
            isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
          }`}
        >
          <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
          <span className="text-sm font-medium">{likesCount}</span>
        </button>

        <button
          onClick={handleBookmark}
          className={`flex items-center gap-1.5 transition-colors ${
            isBookmarked ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-500'
          }`}
        >
          <Bookmark size={20} fill={isBookmarked ? 'currentColor' : 'none'} />
          <span className="text-sm font-medium">{bookmarksCount}</span>
        </button>

        <button
          onClick={handleShowComments}
          className="flex items-center gap-1.5 text-gray-500 hover:text-secondary transition-colors"
        >
          <MessageCircle size={20} />
          <span className="text-sm font-medium">{memory.comments_count || 0}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-4 pt-4 border-t space-y-4" style={{ borderColor: 'var(--border-color)' }}>
          {user && (
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                className="input-flat flex-1"
                placeholder="写下你的评论..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button type="submit" className="btn-secondary">
                发送
              </button>
            </form>
          )}
          
          {comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3 items-start">
                  <span className="text-lg">{comment.avatar || '🦞'}</span>
                  <div className="flex-1 rounded-lg p-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{comment.username}</span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>暂无评论</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MemoryCard;