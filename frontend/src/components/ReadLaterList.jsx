import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Trash2, ChevronRight, BookOpen, Star, FileText, X } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const ReadLaterList = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchItems();
    }
  }, [isOpen, page]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/read-later?page=${page}&limit=10`);
      setItems(res.data.items);
      setTotal(res.data.pagination.total);
    } catch (err) {
      console.error('获取稍后阅读列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (memoryId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_URL}/memories/${memoryId}/read-later`);
      setItems(items.filter(item => item.id !== memoryId));
      setTotal(prev => prev - 1);
    } catch (err) {
      console.error('移除失败:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('确定要清空所有稍后阅读吗？')) return;
    
    try {
      await axios.delete(`${API_URL}/read-later`);
      setItems([]);
      setTotal(0);
    } catch (err) {
      console.error('清空失败:', err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const truncate = (text, length = 50) => {
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
            <Clock size={20} className="text-primary" />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>稍后阅读</h2>
            <span 
              className="px-2 py-0.5 rounded-full text-xs"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              {total}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-sm text-red-500 hover:text-red-600"
              >
                清空
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X size={20} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--text-secondary)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>暂无稍后阅读内容</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-tertiary)' }}>
                在记忆卡片上点击「稍后阅读」添加
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <div
                  key={item.read_later_id}
                  onClick={() => {
                    navigate(`/memory/${item.id}`);
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
                        {item.title}
                      </h3>
                      <p 
                        className="text-sm mt-1 line-clamp-2"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {truncate(item.content)}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        <span className="flex items-center gap-1">
                          <FileText size={12} />
                          {item.username}
                        </span>
                        <span>添加于 {formatDate(item.added_at)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {item.priority > 0 && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-yellow-100 text-yellow-600">
                          <Star size={10} fill="currentColor" />
                          {item.priority}
                        </span>
                      )}
                      <button
                        onClick={(e) => handleRemove(item.id, e)}
                        className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-500 transition-all"
                        title="移除"
                      >
                        <Trash2 size={14} />
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

export default ReadLaterList;