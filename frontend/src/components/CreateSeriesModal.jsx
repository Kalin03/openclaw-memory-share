import React, { useState } from 'react';
import { X, BookOpen, Lock, Globe } from 'lucide-react';
import axios from 'axios';

const CreateSeriesModal = ({ onClose, onCreated, editSeries = null }) => {
  const [title, setTitle] = useState(editSeries?.title || '');
  const [description, setDescription] = useState(editSeries?.description || '');
  const [cover, setCover] = useState(editSeries?.cover || '📚');
  const [isPublic, setIsPublic] = useState(editSeries?.is_public !== 0);
  const [loading, setLoading] = useState(false);

  const coverOptions = ['📚', '🎯', '💡', '🚀', '🎨', '📊', '🔧', '📝', '🌟', '🔬', '💻', '🌈', '⚡', '🔥', '💎'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('请输入系列标题');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      if (editSeries) {
        // 更新系列
        await axios.put(`/api/series/${editSeries.id}`, {
          title: title.trim(),
          description,
          cover,
          isPublic
        }, config);
      } else {
        // 创建系列
        await axios.post('/api/series', {
          title: title.trim(),
          description,
          cover,
          isPublic
        }, config);
      }

      onCreated && onCreated();
      onClose();
    } catch (error) {
      console.error('操作失败:', error);
      alert(error.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="w-full max-w-md rounded-2xl p-6"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <BookOpen className="text-primary" />
            {editSeries ? '编辑系列' : '创建系列'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              系列标题 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给你的系列起个名字"
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ 
                backgroundColor: 'var(--bg-secondary)', 
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              系列描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简单介绍一下这个系列..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              style={{ 
                backgroundColor: 'var(--bg-secondary)', 
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Cover */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              封面图标
            </label>
            <div className="flex flex-wrap gap-2">
              {coverOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setCover(emoji)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                    cover === emoji 
                      ? 'ring-2 ring-primary bg-primary/10' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              可见性
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                  className="text-primary"
                />
                <Globe size={16} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ color: 'var(--text-primary)' }}>公开</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                  className="text-primary"
                />
                <Lock size={16} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ color: 'var(--text-primary)' }}>私密</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border"
              style={{ 
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-medium disabled:opacity-50"
            >
              {loading ? '处理中...' : (editSeries ? '保存' : '创建')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSeriesModal;