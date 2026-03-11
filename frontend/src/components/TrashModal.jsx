import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, X, Loader2 } from 'lucide-react';

const API_BASE = 'http://localhost:8282';

export default function TrashModal({ isOpen, onClose, onRestore }) {
  const [trashedMemories, setTrashedMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTrash();
    }
  }, [isOpen]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchTrash = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/trash`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('获取回收站失败');
      const data = await response.json();
      setTrashedMemories(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (memoryId) => {
    try {
      const response = await fetch(`${API_BASE}/api/trash/${memoryId}/restore`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('恢复失败');
      
      setTrashedMemories(prev => prev.filter(m => m.id !== memoryId));
      if (onRestore) onRestore();
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePermanentDelete = async (memoryId) => {
    try {
      const response = await fetch(`${API_BASE}/api/trash/${memoryId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('删除失败');
      
      setTrashedMemories(prev => prev.filter(m => m.id !== memoryId));
      setConfirmDelete(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/trash`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('清空失败');
      
      setTrashedMemories([]);
      setConfirmEmpty(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold dark:text-white">回收站</h2>
            {trashedMemories.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({trashedMemories.length} 条记忆)
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : trashedMemories.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>回收站是空的</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trashedMemories.map(memory => (
                <div
                  key={memory.id}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border dark:border-gray-600"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {memory.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                        {memory.content.substring(0, 100)}...
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>删除于 {formatDate(memory.deleted_at)}</span>
                        {memory.tags && (
                          <div className="flex gap-1">
                            {memory.tags.split(',').filter(Boolean).map((tag, i) => (
                              <span key={i} className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded-full">
                                #{tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestore(memory.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                        title="恢复"
                      >
                        <RotateCcw className="w-4 h-4" />
                        恢复
                      </button>
                      {confirmDelete === memory.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handlePermanentDelete(memory.id)}
                            className="px-2 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          >
                            确认
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1.5 text-sm bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(memory.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                          title="永久删除"
                        >
                          <Trash2 className="w-4 h-4" />
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {trashedMemories.length > 0 && (
          <div className="p-4 border-t dark:border-gray-700 flex justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              记忆将在回收站保留30天后自动删除
            </p>
            {confirmEmpty ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-500">确定清空回收站？</span>
                <button
                  onClick={handleEmptyTrash}
                  className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  确认清空
                </button>
                <button
                  onClick={() => setConfirmEmpty(false)}
                  className="px-3 py-1.5 text-sm bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmEmpty(true)}
                className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
              >
                清空回收站
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}