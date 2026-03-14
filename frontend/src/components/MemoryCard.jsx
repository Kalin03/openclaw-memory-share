import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Heart, Bookmark, MessageCircle, Copy, Trash2, Check, Edit2, Share2, ExternalLink, Eye, UserPlus, UserCheck, Loader2, BookOpen, Globe, Lock, Users, FolderPlus, CheckSquare, Bell, QrCode, Clock, Archive } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { highlightText } from '../utils/highlight';
import { undoManager } from '../utils/undoManager';
import axios from 'axios';
import AddToSeriesModal from './AddToSeriesModal';
import AddToCollectionModal from './AddToCollectionModal';
import EmbedContent from './EmbedContent';
import QRShareModal from './QRShareModal';
import LockMemoryModal from './LockMemoryModal';

const API_URL = '/api';
const BASE_URL = window.location.origin;

// 可见性配置
const visibilityConfig = {
  public: { icon: Globe, label: '公开', color: 'text-green-500' },
  followers: { icon: Users, label: '仅关注者', color: 'text-blue-500' },
  private: { icon: Lock, label: '私密', color: 'text-gray-500' }
};

const MemoryCard = ({ memory, onDelete, onEdit, onTagClick, searchQuery, isSelectMode = false, isSelected = false, onSelect, onSetReminder }) => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
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
  const [showQRShare, setShowQRShare] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showAddToSeries, setShowAddToSeries] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [isReadLater, setIsReadLater] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  // 检查关注状态
  useEffect(() => {
    if (user && memory.user_id && user.id !== memory.user_id) {
      checkFollowStatus();
    }
    // 检查稍后阅读状态
    if (user) {
      checkReadLaterStatus();
    }
    // 检查归档状态
    if (memory.archived_at) {
      setIsArchived(true);
    }
  }, [user, memory.user_id, memory.archived_at]);

  const checkReadLaterStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/memories/${memory.id}/read-later`);
      setIsReadLater(res.data.inReadLater);
    } catch (err) {
      // Ignore
    }
  };

  const handleReadLater = async () => {
    if (!user) {
      toast.warning('请先登录');
      return;
    }
    try {
      if (isReadLater) {
        await axios.delete(`${API_URL}/memories/${memory.id}/read-later`);
        setIsReadLater(false);
        
        // 显示带撤销按钮的 toast
        toast.withUndo(
          '已从稍后阅读移除',
          async () => {
            try {
              await axios.post(`${API_URL}/memories/${memory.id}/read-later`);
              setIsReadLater(true);
            } catch (err) {
              console.error('撤销失败:', err);
            }
          },
          { type: 'info' }
        );
      } else {
        await axios.post(`${API_URL}/memories/${memory.id}/read-later`);
        setIsReadLater(true);
        toast.success('已加入稍后阅读');
      }
    } catch (err) {
      console.error('稍后阅读操作失败:', err);
      toast.error('操作失败');
    }
  };

  const handleArchive = async () => {
    if (!user || user.id !== memory.user_id) {
      toast.warning('只能归档自己的记忆');
      return;
    }
    try {
      if (isArchived) {
        await axios.delete(`${API_URL}/memories/${memory.id}/archive`);
        setIsArchived(false);
        toast.success('已取消归档');
      } else {
        await axios.post(`${API_URL}/memories/${memory.id}/archive`);
        setIsArchived(true);
        
        // 显示带撤销按钮的 toast
        toast.withUndo(
          '已归档',
          async () => {
            try {
              await axios.delete(`${API_URL}/memories/${memory.id}/archive`);
              setIsArchived(false);
              toast.success('已取消归档');
            } catch (err) {
              console.error('撤销归档失败:', err);
              toast.error('操作失败');
            }
          },
          { type: 'info' }
        );
        
        // 可选：从列表中移除
        if (onDelete) {
          setTimeout(() => onDelete(memory.id), 500);
        }
      }
    } catch (err) {
      console.error('归档操作失败:', err);
      toast.error('操作失败');
    }
  };

  const checkFollowStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/user/following/${memory.user_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsFollowing(res.data.following);
    } catch (err) {
      console.error('检查关注状态失败:', err);
    }
  };

  const handleFollow = async (e) => {
    e.stopPropagation();
    if (!user) {
      toast.warning('请先登录');
      return;
    }
    if (user.id === memory.user_id) return;
    
    setFollowLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/user/follow/${memory.user_id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsFollowing(res.data.following);
      toast.success(res.data.message);
    } catch (err) {
      console.error('关注操作失败:', err);
      toast.error(err.response?.data?.error || '操作失败');
    } finally {
      setFollowLoading(false);
    }
  };

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
      
      // 如果是取消点赞，显示撤销提示
      if (!res.data.liked) {
        toast.withUndo(
          '已取消点赞',
          async () => {
            try {
              const undoRes = await axios.post(`${API_URL}/memories/${memory.id}/like`);
              setIsLiked(undoRes.data.liked);
              setLikesCount(prev => prev + 1);
            } catch (err) {
              console.error('撤销点赞失败:', err);
            }
          },
          { type: 'info' }
        );
      }
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
      
      // 如果是取消收藏，显示撤销提示
      if (!res.data.bookmarked) {
        toast.withUndo(
          '已取消收藏',
          async () => {
            try {
              const undoRes = await axios.post(`${API_URL}/memories/${memory.id}/bookmark`);
              setIsBookmarked(undoRes.data.bookmarked);
              setBookmarksCount(prev => prev + 1);
            } catch (err) {
              console.error('撤销收藏失败:', err);
            }
          },
          { type: 'info' }
        );
      } else {
        toast.success('已收藏');
      }
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

  // Handle card click in select mode
  const handleCardClick = (e) => {
    // Ignore if clicking on buttons/links
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.mention-link')) {
      return;
    }
    
    if (isSelectMode && onSelect) {
      onSelect(memory.id);
    } else if (!e.target.closest('.card-actions')) {
      navigate(`/memory/${memory.id}`);
    }
  };

  return (
    <div 
      className={`card relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary shadow-lg' : ''} ${isSelectMode ? 'hover:ring-2 hover:ring-primary/50' : ''}`}
      onClick={handleCardClick}
    >
      {/* Selection checkbox in select mode */}
      {isSelectMode && (
        <div className="absolute top-3 left-3 z-10">
          <div 
            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all
                      ${isSelected ? 'bg-primary border-primary' : 'border-gray-300 bg-white'}`}
          >
            {isSelected && <Check size={14} className="text-white" />}
          </div>
        </div>
      )}
      
      {/* Toast提示 */}
      {showToast && (
        <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-medium z-10 animate-pulse">
          ✅ 已复制到剪贴板
        </div>
      )}
      
      {/* Header */}
      <div className={`flex items-center justify-between mb-4 ${isSelectMode ? 'ml-8' : ''}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{memory.avatar || '🦞'}</span>
          <div>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{memory.username}</span>
            <div className="flex items-center gap-2">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(memory.created_at)}</p>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>·</span>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {Math.ceil((memory.content?.replace(/<[^>]+>/g, '').replace(/```[\s\S]*?```/g, '').length || 0) / 500)}分钟阅读
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 关注按钮 */}
          {user && user.id !== memory.user_id && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                isFollowing
                  ? 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {followLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isFollowing ? (
                <>
                  <UserCheck size={14} /> 已关注
                </>
              ) : (
                <>
                  <UserPlus size={14} /> 关注
                </>
              )}
            </button>
          )}
          
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
            onClick={() => setShowQRShare(true)}
            className="p-2 rounded-lg text-gray-500 hover:text-primary transition-colors"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
            title="二维码分享"
          >
            <QrCode size={18} />
          </button>
          
          {/* Lock Button - only for memory owner */}
          {user?.id === memory.user_id && (
            <button
              onClick={() => setShowLockModal(true)}
              className={`p-2 rounded-lg transition-colors ${memory.is_locked ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-500'}`}
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
              title={memory.is_locked ? '已锁定 - 点击解锁' : '锁定记忆'}
            >
              <Lock size={18} />
            </button>
          )}
          
          {/* Add to Collection Button - only for bookmarked memories */}
          {user && isBookmarked && (
            <button
              onClick={() => setShowAddToCollection(true)}
              className="p-2 rounded-lg text-gray-500 hover:text-amber-500 transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
              title="添加到收藏夹"
            >
              <FolderPlus size={18} />
            </button>
          )}
          
          {user?.id === memory.user_id && (
            <>
              <button
                onClick={() => setShowAddToSeries(true)}
                className="p-2 rounded-lg text-gray-500 hover:text-purple-500 transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
                title="添加到系列"
              >
                <BookOpen size={18} />
              </button>
              <button
                onClick={() => onSetReminder && onSetReminder(memory)}
                className="p-2 rounded-lg text-gray-500 hover:text-yellow-500 transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
                title="设置提醒"
              >
                <Bell size={18} />
              </button>
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
      <h3 
        className={`text-xl font-bold mb-3 transition-colors group flex items-center gap-2 ${!isSelectMode ? 'cursor-pointer hover:text-primary' : ''}`} 
        style={{ color: 'var(--text-primary)' }}
        onClick={!isSelectMode ? () => navigate(`/memory/${memory.id}`) : undefined}
        title={!isSelectMode ? "点击查看详情" : undefined}
      >
        <span 
          dangerouslySetInnerHTML={{ 
            __html: searchQuery ? highlightText(memory.title, searchQuery) : memory.title 
          }} 
        />
        <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        {/* 可见性标识 */}
        {memory.visibility && memory.visibility !== 'public' && (() => {
          const config = visibilityConfig[memory.visibility];
          if (!config) return null;
          const Icon = config.icon;
          return (
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${config.color}`} style={{ backgroundColor: 'var(--bg-tertiary)' }} title={config.label}>
              <Icon size={12} />
              <span className="hidden sm:inline">{config.label}</span>
            </span>
          );
        })()}
      </h3>

      {/* Content */}
      <div className="prose prose-sm max-w-none mb-4" style={{ color: 'var(--text-secondary)' }}>
        {searchQuery ? (
          <ReactMarkdown
            components={{
              // 自定义文本节点渲染，实现高亮
              text: ({ children }) => {
                const text = children;
                if (typeof text === 'string' && text.toLowerCase().includes(searchQuery.toLowerCase())) {
                  return <span dangerouslySetInnerHTML={{ __html: highlightText(text, searchQuery) }} />;
                }
                return <span>{text}</span>;
              }
            }}
          >
            {memory.content}
          </ReactMarkdown>
        ) : (
          <ReactMarkdown>{memory.content}</ReactMarkdown>
        )}
      </div>

      {/* Embed Content */}
      <EmbedContent content={memory.content} />

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, index) => (
            <button
              key={index}
              onClick={() => onTagClick && onTagClick(tag)}
              className="tag hover:bg-primary/20 hover:text-primary cursor-pointer transition-colors"
              dangerouslySetInnerHTML={{ 
                __html: searchQuery ? highlightText(`#${tag}`, searchQuery) : `#${tag}` 
              }}
            />
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
          onClick={handleReadLater}
          className={`flex items-center gap-1.5 transition-colors ${
            isReadLater ? 'text-primary' : 'text-gray-500 hover:text-primary'
          }`}
          title={isReadLater ? '从稍后阅读移除' : '加入稍后阅读'}
        >
          <Clock size={20} fill={isReadLater ? 'currentColor' : 'none'} />
        </button>

        {user?.id === memory.user_id && (
          <button
            onClick={handleArchive}
            className={`flex items-center gap-1.5 transition-colors ${
              isArchived ? 'text-primary' : 'text-gray-500 hover:text-primary'
            }`}
            title={isArchived ? '取消归档' : '归档'}
          >
            <Archive size={20} />
          </button>
        )}

        <button
          onClick={handleShowComments}
          className="flex items-center gap-1.5 text-gray-500 hover:text-secondary transition-colors"
        >
          <MessageCircle size={20} />
          <span className="text-sm font-medium">{memory.comments_count || 0}</span>
        </button>

        <div className="flex items-center gap-1.5 text-gray-500">
          <Eye size={20} />
          <span className="text-sm font-medium">{memory.views_count || 0}</span>
        </div>
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
      
      {/* Add to Series Modal */}
      {showAddToSeries && (
        <AddToSeriesModal
          memoryId={memory.id}
          onClose={() => setShowAddToSeries(false)}
          onAdded={() => {
            toast.success('已添加到系列');
          }}
        />
      )}
      
      {/* Add to Collection Modal */}
      {showAddToCollection && (
        <AddToCollectionModal
          memoryId={memory.id}
          onClose={() => setShowAddToCollection(false)}
          onUpdated={() => {}}
        />
      )}
      
      {/* QR Share Modal */}
      {showQRShare && (
        <QRShareModal
          memoryId={memory.id}
          memoryTitle={memory.title}
          onClose={() => setShowQRShare(false)}
        />
      )}
      
      {/* Lock Memory Modal */}
      {showLockModal && (
        <LockMemoryModal
          memoryId={memory.id}
          isLocked={memory.is_locked}
          onLockChange={(locked) => {
            // 刷新记忆数据
            if (locked !== memory.is_locked) {
              window.location.reload();
            }
          }}
          onClose={() => setShowLockModal(false)}
        />
      )}
    </div>
  );
};

export default MemoryCard;