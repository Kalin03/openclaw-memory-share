import React, { useState, useEffect } from 'react';
import { X, BookOpen, Plus, Check, Loader2 } from 'lucide-react';
import axios from 'axios';

const AddToSeriesModal = ({ memoryId, onClose, onAdded }) => {
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToSeries, setAddingToSeries] = useState(null);
  const [memorySeries, setMemorySeries] = useState([]);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newSeriesTitle, setNewSeriesTitle] = useState('');

  useEffect(() => {
    fetchSeries();
    fetchMemorySeries();
  }, [memoryId]);

  const fetchSeries = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      const res = await axios.get('/api/user/series', config);
      setSeriesList(res.data.series || []);
    } catch (error) {
      console.error('获取系列列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemorySeries = async () => {
    try {
      const res = await axios.get(`/api/memories/${memoryId}/series`);
      setMemorySeries(res.data.series || []);
    } catch (error) {
      console.error('获取记忆所属系列失败:', error);
    }
  };

  const isInSeries = (seriesId) => {
    return memorySeries.some(s => s.id === seriesId);
  };

  const handleToggleSeries = async (seriesId) => {
    const token = localStorage.getItem('token');
    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    setAddingToSeries(seriesId);
    try {
      if (isInSeries(seriesId)) {
        // 从系列中移除
        await axios.delete(`/api/series/${seriesId}/memories/${memoryId}`, config);
      } else {
        // 添加到系列
        await axios.post(`/api/series/${seriesId}/memories`, { memoryId }, config);
      }
      
      await fetchMemorySeries();
      onAdded && onAdded();
    } catch (error) {
      console.error('操作失败:', error);
      alert(error.response?.data?.error || '操作失败');
    } finally {
      setAddingToSeries(null);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newSeriesTitle.trim()) {
      alert('请输入系列标题');
      return;
    }

    const token = localStorage.getItem('token');
    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    try {
      // 创建系列
      const createRes = await axios.post('/api/series', {
        title: newSeriesTitle.trim()
      }, config);
      
      // 添加记忆到新系列
      await axios.post(`/api/series/${createRes.data.series.id}/memories`, { memoryId }, config);
      
      await fetchSeries();
      await fetchMemorySeries();
      setShowCreateNew(false);
      setNewSeriesTitle('');
      onAdded && onAdded();
    } catch (error) {
      console.error('创建系列失败:', error);
      alert(error.response?.data?.error || '创建失败');
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
            添加到系列
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Create New Series */}
        {showCreateNew ? (
          <div className="space-y-4">
            <input
              type="text"
              value={newSeriesTitle}
              onChange={(e) => setNewSeriesTitle(e.target.value)}
              placeholder="输入新系列标题"
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ 
                backgroundColor: 'var(--bg-secondary)', 
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateNew(false)}
                className="flex-1 px-4 py-2 rounded-lg border"
                style={{ 
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              >
                取消
              </button>
              <button
                onClick={handleCreateAndAdd}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-medium"
              >
                创建并添加
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Create New Button */}
            <button
              onClick={() => setShowCreateNew(true)}
              className="w-full px-4 py-3 rounded-lg border-2 border-dashed mb-4 flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
              style={{ 
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)'
              }}
            >
              <Plus size={18} />
              创建新系列
            </button>

            {/* Series List */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : seriesList.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                <BookOpen size={40} className="mx-auto mb-3 opacity-50" />
                <p>还没有创建系列</p>
                <p className="text-sm mt-1">点击上方按钮创建第一个系列</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {seriesList.map(series => (
                  <button
                    key={series.id}
                    onClick={() => handleToggleSeries(series.id)}
                    disabled={addingToSeries === series.id}
                    className="w-full px-4 py-3 rounded-lg flex items-center justify-between transition-colors"
                    style={{ 
                      backgroundColor: isInSeries(series.id) ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{series.cover || '📚'}</span>
                      <div className="text-left">
                        <div style={{ color: 'var(--text-primary)' }} className="font-medium">
                          {series.title}
                        </div>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {series.memories_count || 0} 条记忆
                        </div>
                      </div>
                    </div>
                    {addingToSeries === series.id ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : isInSeries(series.id) ? (
                      <div className="flex items-center gap-1 text-red-500">
                        <Check size={18} />
                        <span className="text-sm">已添加</span>
                      </div>
                    ) : (
                      <Plus size={18} style={{ color: 'var(--text-secondary)' }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AddToSeriesModal;