import React, { useState, useEffect } from 'react';
import { X, FileText, Bookmark, Heart, Edit2, Trash2, Check, TrendingUp, Calendar, Tag, MessageCircle, Award, Download, FileJson, Flame, Trophy, Users, Pin, BookOpen, Plus, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ReactMarkdown from 'react-markdown';
import AnalyticsDashboard from './AnalyticsDashboard';
import TagManager from './TagManager';
import axios from 'axios';
import FollowList from './FollowList';
import CreateSeriesModal from './CreateSeriesModal';
import SeriesCard from './SeriesCard';

const API_URL = '/api';

const AVATARS = ['🦞', '🦀', '🦐', '🐙', '🦑', '🐠', '🐟', '🦈', '🐬', '🐳', '🦋', '🐝', '🦄', '🐱', '🐶', '🦊', '🐼', '🐨', '🐯', '🦁'];

const UserProfile = ({ onClose }) => {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('stats');
  const [memories, setMemories] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [stats, setStats] = useState(null);
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [followStats, setFollowStats] = useState({ followingCount: 0, followersCount: 0 });
  const [loading, setLoading] = useState(true);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [editingMemory, setEditingMemory] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [showFollowList, setShowFollowList] = useState(false);
  const [showCreateSeries, setShowCreateSeries] = useState(false);
  const [editingSeries, setEditingSeries] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const [memoriesRes, bookmarksRes, statsRes, checkinRes, followStatsRes, seriesRes] = await Promise.all([
        axios.get(`${API_URL}/user/memories`),
        axios.get(`${API_URL}/user/bookmarks`),
        axios.get(`${API_URL}/user/stats`),
        axios.get(`${API_URL}/user/checkin`),
        axios.get(`${API_URL}/user/follow-stats/${user.id}`),
        axios.get(`${API_URL}/user/series`)
      ]);
      setMemories(memoriesRes.data || []);
      setBookmarks(bookmarksRes.data || []);
      setStats(statsRes.data);
      setCheckinStatus(checkinRes.data);
      setFollowStats(followStatsRes.data);
      setSeriesList(seriesRes.data.series || []);
    } catch (err) {
      console.error('获取用户数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (avatar) => {
    try {
      const res = await axios.put(`${API_URL}/user/profile`, { avatar });
      updateUser(res.data.user);
      setShowAvatarPicker(false);
    } catch (err) {
      console.error('更新头像失败:', err);
    }
  };

  const handleDeleteMemory = async (id) => {
    if (!window.confirm('确定要删除这条记忆吗？')) return;
    
    try {
      await axios.delete(`${API_URL}/memories/${id}`);
      setMemories(memories.filter(m => m.id !== id));
      toast.success('删除成功');
    } catch (err) {
      console.error('删除失败:', err);
      toast.error('删除失败');
    }
  };

  const handlePinMemory = async (id) => {
    try {
      const res = await axios.post(`${API_URL}/memories/${id}/pin`);
      // 更新本地状态
      setMemories(memories.map(m => 
        m.id === id ? { ...m, is_pinned: res.data.pinned ? 1 : 0 } : m
      ));
      // 重新排序（置顶的排前面）
      setMemories(prev => [...prev].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return (b.is_pinned || 0) - (a.is_pinned || 0);
        return new Date(b.created_at) - new Date(a.created_at);
      }));
      toast.success(res.data.message);
    } catch (err) {
      console.error('置顶操作失败:', err);
      toast.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleEditMemory = (memory) => {
    setEditingMemory(memory);
    setEditTitle(memory.title);
    setEditContent(memory.content);
    setEditTags(memory.tags || '');
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      toast.warning('标题和内容不能为空');
      return;
    }

    try {
      const res = await axios.put(`${API_URL}/memories/${editingMemory.id}`, {
        title: editTitle,
        content: editContent,
        tags: editTags
      });
      setMemories(memories.map(m => m.id === editingMemory.id ? res.data.memory : m));
      setEditingMemory(null);
      toast.success('更新成功');
    } catch (err) {
      console.error('更新失败:', err);
      toast.error('更新失败');
    }
  };

  const handleCancelEdit = () => {
    setEditingMemory(null);
    setEditTitle('');
    setEditContent('');
    setEditTags('');
  };

  const handleDeleteSeries = async (seriesId) => {
    if (!window.confirm('确定要删除这个系列吗？系列内的记忆不会被删除。')) return;
    
    try {
      await axios.delete(`${API_URL}/series/${seriesId}`);
      setSeriesList(seriesList.filter(s => s.id !== seriesId));
      toast.success('系列删除成功');
    } catch (err) {
      console.error('删除系列失败:', err);
      toast.error(err.response?.data?.error || '删除失败');
    }
  };

  const handleEditSeries = (series) => {
    setEditingSeries(series);
    setShowCreateSeries(true);
  };

  const handleSeriesCreated = () => {
    fetchUserData();
    setShowCreateSeries(false);
    setEditingSeries(null);
  };

  const handleExport = async (format = 'markdown') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/user/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || '导出失败');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `memories-export.${format === 'json' ? 'json' : 'md'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('导出成功！');
    } catch (err) {
      console.error('导出失败:', err);
      toast.error('导出失败');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center" onClick={e => e.stopPropagation()}>
          <p className="text-gray-600 mb-4">请先登录查看个人主页</p>
          <button onClick={onClose} className="btn-primary">关闭</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="text-5xl hover:scale-110 transition-transform cursor-pointer relative"
                title="点击更换头像"
              >
                {user.avatar || '🦞'}
              </button>
              <div>
                <h2 className="text-2xl font-bold text-dark">{user.username}</h2>
                <p className="text-gray-500 text-sm">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X size={24} className="text-gray-500" />
            </button>
          </div>

          {/* Avatar Picker */}
          {showAvatarPicker && (
            <div className="mt-4 p-4 bg-white rounded-xl shadow-lg">
              <p className="text-sm text-gray-500 mb-3">选择一个头像</p>
              <div className="grid grid-cols-10 gap-2">
                {AVATARS.map((avatar, index) => (
                  <button
                    key={index}
                    onClick={() => handleAvatarChange(avatar)}
                    className={`text-2xl p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                      user.avatar === avatar ? 'bg-primary/20 ring-2 ring-primary' : ''
                    }`}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              <span className="font-semibold text-dark">{stats?.daysJoined || 0}</span>
              <span className="text-gray-500 text-sm">天</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              <span className="font-semibold text-dark">{memories.length}</span>
              <span className="text-gray-500 text-sm">发布</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart size={18} className="text-red-500" />
              <span className="font-semibold text-dark">{stats?.totalLikes || 0}</span>
              <span className="text-gray-500 text-sm">获赞</span>
            </div>
            <div className="flex items-center gap-2">
              <Bookmark size={18} className="text-yellow-500" />
              <span className="font-semibold text-dark">{stats?.totalBookmarks || 0}</span>
              <span className="text-gray-500 text-sm">被收藏</span>
            </div>
            <button
              onClick={() => setShowFollowList(true)}
              className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer"
            >
              <Users size={18} className="text-purple-500" />
              <span className="font-semibold text-dark">{followStats.followingCount}</span>
              <span className="text-gray-500 text-sm">关注</span>
              <span className="font-semibold text-dark">{followStats.followersCount}</span>
              <span className="text-gray-500 text-sm">粉丝</span>
            </button>
            {checkinStatus && (
              <>
                <div className="flex items-center gap-2">
                  <Flame size={18} className="text-orange-500" />
                  <span className="font-semibold text-dark">{checkinStatus.currentStreak}</span>
                  <span className="text-gray-500 text-sm">连续签到</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy size={18} className="text-amber-500" />
                  <span className="font-semibold text-dark">{checkinStatus.totalCheckins}</span>
                  <span className="text-gray-500 text-sm">累计签到</span>
                </div>
              </>
            )}
            <button
              onClick={() => setShowAnalytics(true)}
              className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-primary"
            >
              <BarChart3 size={18} />
              <span className="text-sm font-medium">数据统计</span>
            </button>
            <button
              onClick={() => setShowTagManager(true)}
              className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-primary"
            >
              <Tag size={18} />
              <span className="text-sm font-medium">标签管理</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === 'stats'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-dark'
            }`}
          >
            <TrendingUp size={16} className="inline mr-1" />
            数据统计
          </button>
          <button
            onClick={() => setActiveTab('memories')}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === 'memories'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-dark'
            }`}
          >
            我的发布 ({memories.length})
          </button>
          <button
            onClick={() => setActiveTab('series')}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === 'series'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-dark'
            }`}
          >
            <BookOpen size={16} className="inline mr-1" />
            我的系列 ({seriesList.length})
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === 'bookmarks'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-dark'
            }`}
          >
            我的收藏 ({bookmarks.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : activeTab === 'stats' ? (
            stats && (
              <div className="space-y-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 text-center">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold text-dark">{stats.daysJoined}</div>
                    <div className="text-sm text-gray-500">加入天数</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-xl p-4 text-center">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                    <div className="text-2xl font-bold text-dark">{stats.memoriesCount}</div>
                    <div className="text-sm text-gray-500">发布记忆</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-xl p-4 text-center">
                    <Heart className="w-8 h-8 mx-auto mb-2 text-red-500" />
                    <div className="text-2xl font-bold text-dark">{stats.totalLikes}</div>
                    <div className="text-sm text-gray-500">获得点赞</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-xl p-4 text-center">
                    <Bookmark className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                    <div className="text-2xl font-bold text-dark">{stats.totalBookmarks}</div>
                    <div className="text-sm text-gray-500">被收藏</div>
                  </div>
                </div>

                {/* Checkin Stats */}
                {checkinStatus && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-100">
                    <h3 className="font-bold text-dark mb-4 flex items-center gap-2">
                      <Flame size={20} className="text-orange-500" />
                      签到统计
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-orange-500">{checkinStatus.currentStreak}</div>
                        <div className="text-sm text-gray-500">连续签到</div>
                        {checkinStatus.checkedInToday && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">
                            今日已签
                          </span>
                        )}
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-amber-500">{checkinStatus.maxStreak}</div>
                        <div className="text-sm text-gray-500">最长连续</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-500">{checkinStatus.totalCheckins}</div>
                        <div className="text-sm text-gray-500">累计签到</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Activity Stats */}
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-bold text-dark mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-primary" />
                    活跃度分析
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-lg font-semibold text-dark">{stats.postingFrequency}</div>
                      <div className="text-sm text-gray-500">每周发布</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-lg font-semibold text-dark">{stats.avgLikes}</div>
                      <div className="text-sm text-gray-500">平均点赞</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-lg font-semibold text-dark">{stats.avgBookmarks}</div>
                      <div className="text-sm text-gray-500">平均收藏</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-lg font-semibold text-dark">{stats.likesCount}</div>
                      <div className="text-sm text-gray-500">点赞他人</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-lg font-semibold text-dark">{stats.bookmarksCount}</div>
                      <div className="text-sm text-gray-500">收藏记忆</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-lg font-semibold text-dark">{stats.commentsMadeCount}</div>
                      <div className="text-sm text-gray-500">发表评论</div>
                    </div>
                  </div>
                </div>

                {/* Top Tags */}
                {stats.topTags && stats.topTags.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="font-bold text-dark mb-4 flex items-center gap-2">
                      <Tag size={20} className="text-primary" />
                      常用标签
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {stats.topTags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-white rounded-full text-sm text-gray-700 border border-gray-200 hover:border-primary hover:text-primary transition-colors cursor-pointer"
                        >
                          #{tag.name} <span className="text-gray-400">({tag.count})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Most Popular Memory */}
                {stats.mostPopularMemory && (
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-5 border border-amber-100">
                    <h3 className="font-bold text-dark mb-3 flex items-center gap-2">
                      <Award size={20} className="text-amber-500" />
                      最受欢迎的记忆
                    </h3>
                    <div className="bg-white rounded-lg p-4">
                      <div className="font-semibold text-dark mb-2">{stats.mostPopularMemory.title}</div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Heart size={14} className="text-red-400" />
                          {stats.mostPopularMemory.likes_count} 点赞
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Achievement Tips */}
                <div className="bg-primary/5 rounded-xl p-5 border border-primary/10">
                  <h3 className="font-bold text-dark mb-3">🎯 成就进度</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">发布 10 条记忆</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min(stats.memoriesCount / 10 * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{Math.min(stats.memoriesCount, 10)}/10</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">获得 50 个点赞</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-400 rounded-full transition-all"
                            style={{ width: `${Math.min(stats.totalLikes / 50 * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{Math.min(stats.totalLikes, 50)}/50</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">获得 20 次收藏</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-yellow-400 rounded-full transition-all"
                            style={{ width: `${Math.min(stats.totalBookmarks / 20 * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{Math.min(stats.totalBookmarks, 20)}/20</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : activeTab === 'memories' ? (
            memories.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl mb-4 block">📝</span>
                <p className="text-gray-500">还没有发布过记忆</p>
              </div>
            ) : (
              <div className="space-y-4">
                {memories.map(memory => (
                  <div key={memory.id} className={`border rounded-xl p-4 hover:shadow-sm transition-shadow ${memory.is_pinned ? 'border-primary/30 bg-primary/5' : 'border-gray-100'}`}>
                    {editingMemory?.id === memory.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="标题"
                        />
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px]"
                          placeholder="内容 (支持Markdown)"
                        />
                        <input
                          type="text"
                          value={editTags}
                          onChange={(e) => setEditTags(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="标签 (逗号分隔)"
                        />
                        <div className="flex gap-2">
                          <button onClick={handleSaveEdit} className="btn-primary flex items-center gap-1">
                            <Check size={16} /> 保存
                          </button>
                          <button onClick={handleCancelEdit} className="btn-secondary">
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {memory.is_pinned && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded-full">
                                  <Pin size={12} /> 置顶
                                </span>
                              )}
                              <h3 className="font-bold text-dark">{memory.title}</h3>
                            </div>
                            <p className="text-sm text-gray-500 mb-2">{formatDate(memory.created_at)}</p>
                            <div className="prose prose-sm max-w-none text-gray-600 text-sm line-clamp-3">
                              <ReactMarkdown>{memory.content}</ReactMarkdown>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handlePinMemory(memory.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                memory.is_pinned 
                                  ? 'bg-primary/20 text-primary' 
                                  : 'text-gray-500 hover:text-primary hover:bg-gray-100'
                              }`}
                              title={memory.is_pinned ? '取消置顶' : '置顶'}
                            >
                              <Pin size={16} />
                            </button>
                            <button
                              onClick={() => handleEditMemory(memory)}
                              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary transition-colors"
                              title="编辑"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteMemory(memory.id)}
                              className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                              title="删除"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Heart size={14} /> {memory.likes_count || 0}
                          </span>
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Bookmark size={14} /> {memory.bookmarks_count || 0}
                          </span>
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            📝 {memory.comments_count || 0}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'series' ? (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => {
                    setEditingSeries(null);
                    setShowCreateSeries(true);
                  }}
                  className="btn-primary flex items-center gap-1"
                >
                  <Plus size={16} /> 创建系列
                </button>
              </div>
              {seriesList.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-4xl mb-4 block">📚</span>
                  <p className="text-gray-500 mb-2">还没有创建系列</p>
                  <p className="text-sm text-gray-400">创建系列来整理你的记忆</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {seriesList.map(s => (
                    <SeriesCard
                      key={s.id}
                      series={s}
                      showActions={true}
                      onEdit={handleEditSeries}
                      onDelete={handleDeleteSeries}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            bookmarks.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl mb-4 block">🔖</span>
                <p className="text-gray-500">还没有收藏过记忆</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookmarks.map(memory => (
                  <div key={memory.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                    <h3 className="font-bold text-dark mb-1">{memory.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {memory.username} · {formatDate(memory.created_at)}
                    </p>
                    <div className="prose prose-sm max-w-none text-gray-600 text-sm line-clamp-3">
                      <ReactMarkdown>{memory.content}</ReactMarkdown>
                    </div>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Heart size={14} /> {memory.likes_count || 0}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Bookmark size={14} /> {memory.bookmarks_count || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
      
      {/* Follow List Modal */}
      {showFollowList && (
        <FollowList 
          userId={user.id} 
          username={user.username} 
          onClose={() => setShowFollowList(false)} 
        />
      )}
      
      {/* Create/Edit Series Modal */}
      {showCreateSeries && (
        <CreateSeriesModal
          editSeries={editingSeries}
          onClose={() => {
            setShowCreateSeries(false);
            setEditingSeries(null);
          }}
          onCreated={handleSeriesCreated}
        />
      )}
      
      {/* Analytics Dashboard */}
      {showAnalytics && (
        <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
      )}
      
      {/* Tag Manager */}
      {showTagManager && (
        <TagManager onClose={() => setShowTagManager(false)} />
      )}
    </div>
  );
};

export default UserProfile;