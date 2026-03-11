import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, BookOpen, Lock, Edit, Trash2, Plus, 
  GripVertical, Loader2, Share2, User 
} from 'lucide-react';
import axios from 'axios';
import MemoryCard from './MemoryCard';
import { useAuth } from '../context/AuthContext';
import CreateSeriesModal from './CreateSeriesModal';

const SeriesDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [series, setSeries] = useState(null);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    fetchSeries();
  }, [id]);

  const fetchSeries = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get(`/api/series/${id}`, config);
      setSeries(res.data);
      setMemories(res.data.memories || []);
    } catch (error) {
      console.error('获取系列详情失败:', error);
      if (error.response?.status === 404) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这个系列吗？系列内的记忆不会被删除。')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/series/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate(-1);
    } catch (error) {
      console.error('删除系列失败:', error);
      alert(error.response?.data?.error || '删除失败');
    }
  };

  const handleRemoveMemory = async (memoryId) => {
    if (!window.confirm('确定要从系列中移除这条记忆吗？')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/series/${id}/memories/${memoryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchSeries();
    } catch (error) {
      console.error('移除记忆失败:', error);
      alert(error.response?.data?.error || '移除失败');
    }
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newMemories = [...memories];
    const draggedMemory = newMemories[draggedIndex];
    newMemories.splice(draggedIndex, 1);
    newMemories.splice(index, 0, draggedMemory);
    setMemories(newMemories);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;
    
    setIsReordering(true);
    try {
      const token = localStorage.getItem('token');
      const orders = memories.map((m, i) => ({ memoryId: m.id, sortOrder: i + 1 }));
      await axios.put(`/api/series/${id}/order`, { orders }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('更新排序失败:', error);
    } finally {
      setIsReordering(false);
      setDraggedIndex(null);
    }
  };

  const isOwner = user && series && user.id === series.user_id;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!series) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-light)' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 mb-4 hover:text-primary transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={20} />
            返回
          </button>

          {/* Series Info */}
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white/80 flex items-center justify-center text-5xl shadow-md">
              {series.cover || '📚'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {series.title}
                </h1>
                {!series.is_public && (
                  <Lock size={18} className="text-gray-400" title="私密系列" />
                )}
              </div>
              {series.description && (
                <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
                  {series.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3">
                <div 
                  className="flex items-center gap-1 text-sm cursor-pointer hover:text-primary"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => navigate(`/user/${series.user_id}`)}
                >
                  <User size={14} />
                  <span>{series.username}</span>
                </div>
                <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <BookOpen size={14} />
                  <span>{memories.length} 条记忆</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {isOwner && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                  title="编辑"
                >
                  <Edit size={18} style={{ color: 'var(--text-secondary)' }} />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                  title="删除"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {memories.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--text-secondary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>
              {isOwner ? '这个系列还没有记忆，去添加一些吧！' : '这个系列还没有记忆'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {memories.map((memory, index) => (
              <div
                key={memory.id}
                className="relative"
                draggable={isOwner}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                {isOwner && (
                  <div className="absolute -left-8 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing">
                    <GripVertical size={20} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                )}
                <MemoryCard 
                  memory={memory} 
                  onTagClick={(tag) => navigate(`/?search=${encodeURIComponent(tag)}`)}
                />
                {isOwner && (
                  <button
                    onClick={() => handleRemoveMemory(memory.id)}
                    className="absolute top-4 right-4 px-3 py-1 rounded-lg text-sm bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                  >
                    从系列移除
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <CreateSeriesModal
          editSeries={series}
          onClose={() => setShowEditModal(false)}
          onCreated={fetchSeries}
        />
      )}
    </div>
  );
};

export default SeriesDetail;