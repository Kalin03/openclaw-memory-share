import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Heart, Bookmark, MessageCircle, ArrowLeft, Copy, Check, Share2, Edit2, Trash2, Eye, Reply, ThumbsUp, History, Link2, Tag, User, Clock, FileText, BarChart2, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MentionInput from './MentionInput';
import VersionHistoryModal from './VersionHistoryModal';
import MemoryReferences from './MemoryReferences';
import EmbedContent from './EmbedContent';
import RatingSection from './RatingSection';
import TextToSpeech from './TextToSpeech';
import PrintButton from './PrintButton';
import ContentQualityAnalyzer from './ContentQualityAnalyzer';
import QuickActionsBar from './QuickActionsBar';
import LockMemoryModal from './LockMemoryModal';
import ReminderManager from './ReminderManager';
import ReadingMode from './ReadingMode';
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
  const [showQualityAnalyzer, setShowQualityAnalyzer] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null); // { id, username }
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [relatedMemories, setRelatedMemories] = useState([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showReadingMode, setShowReadingMode] = useState(false);

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
      
      // 获取相关记忆
      fetchRelatedMemories();
    } catch (err) {
      console.error('获取记忆失败:', err);
      setError('记忆不存在或已被删除');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedMemories = async () => {
    try {
      const res = await axios.get(`${API_URL}/memories/${id}/related`);
      setRelatedMemories(res.data);
    } catch (err) {
      console.error('获取相关记忆失败:', err);
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

  const handlePin = async () => {
    if (!user || user.id !== memory.user_id) return;
    
    try {
      const res = await axios.post(`${API_URL}/memories/${id}/pin`);
      setMemory(prev => ({ ...prev, is_pinned: res.data.pinned }));
      toast.success(res.data.message);
    } catch (err) {
      console.error('置顶操作失败:', err);
      toast.error('操作失败');
    }
  };

  const handleLock = async () => {
    if (!user || user.id !== memory.user_id) return;
    setShowLockModal(true);
  };

  const handleReminder = async () => {
    if (!user || user.id !== memory.user_id) return;
    setShowReminderModal(true);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    
    try {
      const res = await axios.post(`${API_URL}/memories/${id}/comments`, {
        content: newComment,
        replyToId: replyTo?.id || null
      });
      setComments([res.data.comment, ...comments]);
      setNewComment('');
      setReplyTo(null);
      toast.success(replyTo ? '回复成功' : '评论成功');
    } catch (err) {
      console.error('评论失败:', err);
      toast.error('评论失败');
    }
  };

  const handleReply = (comment) => {
    setReplyTo({ id: comment.id, username: comment.username });
    // 滚动到评论框
    document.querySelector('textarea')?.focus();
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  const handleCommentLike = async (commentId, isLiked) => {
    if (!user) {
      toast.warning('请先登录');
      return;
    }
    
    try {
      if (isLiked) {
        // 取消点赞
        await axios.delete(`${API_URL}/comments/${commentId}/like`);
      } else {
        // 点赞
        await axios.post(`${API_URL}/comments/${commentId}/like`);
      }
      
      // 更新评论列表
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            is_liked: !isLiked,
            likes_count: isLiked ? c.likes_count - 1 : (c.likes_count || 0) + 1
          };
        }
        return c;
      }));
    } catch (err) {
      console.error('评论点赞失败:', err);
      toast.error('操作失败');
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

  // 渲染评论内容，处理@提及
  const renderCommentContent = (content) => {
    if (!content) return null;
    
    // 匹配 @用户名 的正则
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // 添加@之前的内容
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      
      // 添加@用户名链接
      parts.push(
        <button
          key={match.index}
          onClick={() => navigate(`/user/${match[1]}`)}
          className="text-primary hover:underline font-medium"
        >
          @{match[1]}
        </button>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // 添加最后一部分内容
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    
    return parts;
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
                    onClick={() => setShowVersionHistory(true)}
                    className="p-2 rounded-lg text-gray-500 hover:text-purple-500 transition-colors"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    title="版本历史"
                  >
                    <History size={18} />
                  </button>
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
          <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{memory.title}</h1>

          {/* Text to Speech & Print */}
          <div className="relative mb-6 flex items-center gap-3">
            <TextToSpeech text={memory.content} title={memory.title} />
            <PrintButton title={memory.title} />
            <button
              onClick={() => setShowQualityAnalyzer(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              title="内容质量分析"
            >
              <BarChart2 size={16} />
              <span className="hidden sm:inline">质量分析</span>
            </button>
            <button
              onClick={() => setShowReadingMode(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              title="专注阅读"
            >
              <BookOpen size={16} />
              <span className="hidden sm:inline">阅读模式</span>
            </button>
          </div>

          {/* Reading Stats */}
          <div className="flex items-center gap-4 mb-6 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {Math.ceil((memory.content?.replace(/<[^>]+>/g, '').replace(/```[\s\S]*?```/g, '').length || 0) / 500)}分钟阅读
            </span>
            <span className="flex items-center gap-1">
              <FileText size={14} />
              {memory.content?.replace(/<[^>]+>/g, '').replace(/```[\s\S]*?```/g, '').replace(/\s/g, '').length || 0}字
            </span>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none mb-6" style={{ color: 'var(--text-secondary)' }}>
            <ReactMarkdown>{memory.content}</ReactMarkdown>
          </div>

          {/* Embed Content */}
          <EmbedContent content={memory.content} />

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

            <div className="flex items-center gap-2 text-gray-500">
              <Eye size={24} />
              <span className="font-medium">{memory.views_count || 0}</span>
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
                  {replyTo && (
                    <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <Reply size={14} className="text-primary" />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        回复 <span className="text-primary font-medium">@{replyTo.username}</span>
                      </span>
                      <button
                        type="button"
                        onClick={cancelReply}
                        className="ml-auto text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <MentionInput
                    className="input-flat w-full min-h-[80px] resize-none"
                    placeholder={replyTo ? `回复 @${replyTo.username}...` : "写下你的评论... 支持 @用户名 提及他人"}
                    value={newComment}
                    onChange={setNewComment}
                    minRows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={!newComment.trim()}
                    >
                      {replyTo ? '发送回复' : '发表评论'}
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
                        {comment.reply_to_username && (
                          <>
                            <span className="text-gray-400">回复</span>
                            <span className="text-primary font-medium">
                              @{comment.reply_to_username}
                            </span>
                          </>
                        )}
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)' }}>{renderCommentContent(comment.content)}</p>
                      <div className="flex items-center gap-4 mt-2">
                        {user && (
                          <button
                            onClick={() => handleReply(comment)}
                            className="flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors"
                          >
                            <Reply size={14} />
                            <span>回复</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleCommentLike(comment.id, comment.is_liked)}
                          className={`flex items-center gap-1 text-sm transition-colors ${
                            comment.is_liked 
                              ? 'text-primary' 
                              : 'text-gray-400 hover:text-primary'
                          }`}
                        >
                          <ThumbsUp size={14} fill={comment.is_liked ? 'currentColor' : 'none'} />
                          <span>{comment.likes_count || 0}</span>
                        </button>
                      </div>
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

        {/* Rating Section */}
        <RatingSection memoryId={id} />

        {/* Memory References Section */}
        <MemoryReferences memoryId={id} />

        {/* Related Memories Section */}
        {relatedMemories.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Link2 size={20} className="text-primary" />
              相关记忆
            </h2>
            
            <div className="grid gap-4">
              {relatedMemories.map(related => (
                <div
                  key={related.id}
                  onClick={() => {
                    navigate(`/memory/${related.id}`);
                    window.scrollTo(0, 0);
                  }}
                  className="card cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-lg truncate" style={{ color: 'var(--text-primary)' }}>
                        {related.title}
                      </h3>
                      <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                        {related.content?.replace(/[#*`]/g, '').substring(0, 100)}...
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{related.avatar || '🦞'}</span>
                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{related.username}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <span className="flex items-center gap-1">
                            <Heart size={14} /> {related.likes_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye size={14} /> {related.views_count || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 关联类型标识 */}
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      related.relation_type === 'series' 
                        ? 'bg-purple-100 text-purple-600' 
                        : related.relation_type === 'tag' 
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                      {related.relation_type === 'series' && (
                        <span className="flex items-center gap-1">
                          <Link2 size={12} /> 同系列
                        </span>
                      )}
                      {related.relation_type === 'tag' && (
                        <span className="flex items-center gap-1">
                          <Tag size={12} /> 相似标签
                        </span>
                      )}
                      {related.relation_type === 'author' && (
                        <span className="flex items-center gap-1">
                          <User size={12} /> 同作者
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Quick Actions Bar */}
      {memory && (
        <QuickActionsBar
          memory={memory}
          isOwner={user?.id === memory.user_id}
          isLiked={isLiked}
          isBookmarked={isBookmarked}
          onLike={handleLike}
          onBookmark={handleBookmark}
          onEdit={() => navigate(`/?edit=${memory.id}`)}
          onDelete={handleDelete}
          onShare={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success('链接已复制');
          }}
          onReminder={handleReminder}
          onLock={handleLock}
          onPin={handlePin}
          onPrint={() => window.print()}
        />
      )}

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        memoryId={id}
        isOwner={user?.id === memory?.user_id}
        onRestored={fetchMemory}
      />

      {/* Content Quality Analyzer */}
      {showQualityAnalyzer && (
        <ContentQualityAnalyzer
          memoryId={id}
          onClose={() => setShowQualityAnalyzer(false)}
        />
      )}

      {/* Lock Memory Modal */}
      {showLockModal && (
        <LockMemoryModal
          memoryId={id}
          onClose={() => setShowLockModal(false)}
          onLocked={() => {
            fetchMemory();
            setShowLockModal(false);
          }}
        />
      )}

      {/* Reminder Manager */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg max-h-[80vh] overflow-auto rounded-lg" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <ReminderManager
              memoryId={id}
              onClose={() => setShowReminderModal(false)}
            />
          </div>
        </div>
      )}

      {/* Reading Mode */}
      <ReadingMode
        isOpen={showReadingMode}
        onClose={() => setShowReadingMode(false)}
        title={memory?.title}
        content={memory?.content}
        author={memory?.username}
        avatar={memory?.avatar}
        createdAt={memory?.created_at}
      />
    </div>
  );
};

export default MemoryDetail;