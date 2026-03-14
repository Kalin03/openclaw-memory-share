import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, RotateCcw, Trash2, Clock, ChevronRight } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const ArchiveList = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchArchives();
    }
  }, [isOpen, page]);

  const fetchArchives = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/archives?page=${page}&limit=10`);
      setMemories(res.data.memories);
      setTotal(res.data.pagination.total);
    } catch (err) {
      console.error('获取归档列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async (memoryId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_URL}/memories/${memoryId}/archive`);
      setMemories(memories.filter(m => m.id !== memoryId));
      setTotal(prev => prev - 1);
    } catch (err) {
      console.error('取消归档失败:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const truncate = (text, length = 80) => {
    if (!text) return '';
    const clean = text.replace(/[#*`]/g, '').replace(/\n/g, ' ');
    return clean.length > length ? clean.substring(0, length) + '...' : clean;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        className="relative w-full max-w-md h-full overflow-hidden flex flex-col shadow-xl"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Archive size={20} className="text-primary" />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>归档</h2>
            <span 
              className="px-2 py-0.5 rounded-full text-xs"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              {total}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Archive size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-12">
              <Archive size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--text-secondary)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>暂无归档内容</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-tertiary)' }}>
                归档的记忆将保存在这里
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {memories.map(memory => (
                <div
                  key={memory.id}
                  onClick={() => {
                    navigate(`/memory/${memory.id}`);
                    onClose();
                  }}
                  className="group p-3 rounded-lg cursor-pointer transition-all hover:shadow-md"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="font-medium truncate group-hover:text-primary transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {memory.title}
                      </h3>
                      <p 
                        className="text-sm mt-1 line-clamp-2"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {truncate(memory.content)}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          归档于 {formatDate(memory.archived_at)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleUnarchive(memory.id, e)}
                        className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-primary transition-all"
                        title="取消归档"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {total > 10 && (
          <div className="px-4 py-3 border-t flex justify-between items-center" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded text-sm disabled:opacity-50"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              上一页
            </button>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              第 {page} 页 / 共 {Math.ceil(total / 10)} 页
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * 10 >= total}
              className="px-3 py-1 rounded text-sm disabled:opacity-50"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchiveList;