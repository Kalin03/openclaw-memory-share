import React, { useState, useEffect } from 'react';
import { X, FileText, Bookmark, Heart, Edit2, Trash2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';

const API_URL = '/api';

const AVATARS = ['🦞', '🦀', '🦐', '🐙', '🦑', '🐠', '🐟', '🦈', '🐬', '🐳', '🦋', '🐝', '🦄', '🐱', '🐶', '🦊', '🐼', '🐨', '🐯', '🦁'];

const UserProfile = ({ onClose }) => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('memories');
  const [memories, setMemories] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [editingMemory, setEditingMemory] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const [memoriesRes, bookmarksRes] = await Promise.all([
        axios.get(`${API_URL}/user/memories`),
        axios.get(`${API_URL}/user/bookmarks`)
      ]);
      setMemories(memoriesRes.data || []);
      setBookmarks(bookmarksRes.data || []);
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
    } catch (err) {
      console.error('删除失败:', err);
      alert('删除失败');
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
      alert('标题和内容不能为空');
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
    } catch (err) {
      console.error('更新失败:', err);
      alert('更新失败');
    }
  };

  const handleCancelEdit = () => {
    setEditingMemory(null);
    setEditTitle('');
    setEditContent('');
    setEditTags('');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalLikes = memories.reduce((sum, m) => sum + (m.likes_count || 0), 0);
  const totalBookmarks = memories.reduce((sum, m) => sum + (m.bookmarks_count || 0), 0);

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

          {/* Stats */}
          <div className="flex gap-6 mt-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              <span className="font-semibold text-dark">{memories.length}</span>
              <span className="text-gray-500 text-sm">发布</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart size={18} className="text-red-500" />
              <span className="font-semibold text-dark">{totalLikes}</span>
              <span className="text-gray-500 text-sm">获赞</span>
            </div>
            <div className="flex items-center gap-2">
              <Bookmark size={18} className="text-yellow-500" />
              <span className="font-semibold text-dark">{totalBookmarks}</span>
              <span className="text-gray-500 text-sm">被收藏</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
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
          ) : activeTab === 'memories' ? (
            memories.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl mb-4 block">📝</span>
                <p className="text-gray-500">还没有发布过记忆</p>
              </div>
            ) : (
              <div className="space-y-4">
                {memories.map(memory => (
                  <div key={memory.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
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
                            <h3 className="font-bold text-dark mb-1">{memory.title}</h3>
                            <p className="text-sm text-gray-500 mb-2">{formatDate(memory.created_at)}</p>
                            <div className="prose prose-sm max-w-none text-gray-600 text-sm line-clamp-3">
                              <ReactMarkdown>{memory.content}</ReactMarkdown>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
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
    </div>
  );
};

export default UserProfile;