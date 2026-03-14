import React, { useState, useEffect } from 'react';
import {
  Trash2,
  Bookmark,
  BookmarkCheck,
  FolderPlus,
  ListPlus,
  Eye,
  EyeOff,
  X,
  CheckSquare,
  Square,
  Loader2,
  Users
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const BatchOperationsToolbar = ({
  selectedIds,
  onClearSelection,
  onComplete,
  userId
}) => {
  const { success, error, withUndo } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSeriesModal, setShowSeriesModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [series, setSeries] = useState([]);
  const [collections, setCollections] = useState([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);

  const selectedCount = selectedIds.length;

  // Fetch user's series when modal opens
  useEffect(() => {
    if (showSeriesModal) {
      axios.get('/api/user/series').then(res => {
        setSeries(res.data || []);
      }).catch(err => {
        console.error('获取系列失败:', err);
      });
    }
  }, [showSeriesModal]);

  // Fetch user's collections when modal opens
  useEffect(() => {
    if (showCollectionModal) {
      axios.get('/api/collections').then(res => {
        setCollections(res.data || []);
      }).catch(err => {
        console.error('获取收藏夹失败:', err);
      });
    }
  }, [showCollectionModal]);

  const handleBatchDelete = async () => {
    setLoading(true);
    const deletedIds = [...selectedIds];
    
    try {
      const res = await axios.post('/api/memories/batch/delete', {
        memoryIds: deletedIds
      });
      
      onClearSelection();
      onComplete();
      
      // 显示带撤销按钮的提示
      withUndo(
        `已删除 ${deletedIds.length} 条记忆`,
        async () => {
          try {
            // 批量恢复
            for (const id of deletedIds) {
              await axios.post(`/api/trash/${id}/restore`);
            }
            onComplete();
            success('已恢复所有记忆');
          } catch (err) {
            console.error('恢复失败:', err);
            error('部分记忆恢复失败');
          }
        },
        { type: 'warning' }
      );
    } catch (err) {
      error(err.response?.data?.error || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchBookmark = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/memories/batch/bookmark', {
        memoryIds: selectedIds
      });
      success(res.data.message);
      onComplete();
    } catch (error) {
      error(error.response?.data?.error || '收藏失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchUnbookmark = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/memories/batch/unbookmark', {
        memoryIds: selectedIds
      });
      success(res.data.message);
      onComplete();
    } catch (error) {
      error(error.response?.data?.error || '取消收藏失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToSeries = async () => {
    if (!selectedSeriesId) {
      error('请选择系列');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/memories/batch/series', {
        memoryIds: selectedIds,
        seriesId: selectedSeriesId
      });
      success(res.data.message);
      setShowSeriesModal(false);
      setSelectedSeriesId('');
      onComplete();
    } catch (error) {
      error(error.response?.data?.error || '添加到系列失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCollection = async () => {
    if (!selectedCollectionId) {
      error('请选择收藏夹');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/memories/batch/collection', {
        memoryIds: selectedIds,
        collectionId: selectedCollectionId
      });
      success(res.data.message);
      setShowCollectionModal(false);
      setSelectedCollectionId('');
      onComplete();
    } catch (error) {
      error(error.response?.data?.error || '添加到收藏夹失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchVisibility = async (visibility) => {
    setLoading(true);
    setShowVisibilityMenu(false);
    try {
      const res = await axios.post('/api/memories/batch/visibility', {
        memoryIds: selectedIds,
        visibility
      });
      success(res.data.message);
      onComplete();
    } catch (error) {
      error(error.response?.data?.error || '修改可见性失败');
    } finally {
      setLoading(false);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      {/* Toolbar */}
      <div 
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 
                    flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backdropFilter: 'blur(10px)'
        }}
      >
        {/* Selection count */}
        <div className="flex items-center gap-2 text-white mr-2">
          <CheckSquare size={18} />
          <span className="font-medium">已选择 {selectedCount} 条</span>
        </div>

        <div className="w-px h-6 bg-white/30" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Delete */}
          <button
            onClick={handleBatchDelete}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white 
                       hover:bg-white/20 transition-colors disabled:opacity-50"
            title="批量删除"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            <span className="hidden sm:inline">删除</span>
          </button>

          {/* Bookmark */}
          <button
            onClick={handleBatchBookmark}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white 
                       hover:bg-white/20 transition-colors disabled:opacity-50"
            title="批量收藏"
          >
            <Bookmark size={16} />
            <span className="hidden sm:inline">收藏</span>
          </button>

          {/* Unbookmark */}
          <button
            onClick={handleBatchUnbookmark}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white 
                       hover:bg-white/20 transition-colors disabled:opacity-50"
            title="批量取消收藏"
          >
            <BookmarkCheck size={16} />
            <span className="hidden sm:inline text-xs">取消收藏</span>
          </button>

          {/* Add to series */}
          <button
            onClick={() => setShowSeriesModal(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white 
                       hover:bg-white/20 transition-colors disabled:opacity-50"
            title="批量添加到系列"
          >
            <ListPlus size={16} />
            <span className="hidden sm:inline">系列</span>
          </button>

          {/* Add to collection */}
          <button
            onClick={() => setShowCollectionModal(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white 
                       hover:bg-white/20 transition-colors disabled:opacity-50"
            title="批量添加到收藏夹"
          >
            <FolderPlus size={16} />
            <span className="hidden sm:inline">收藏夹</span>
          </button>

          {/* Visibility */}
          <div className="relative">
            <button
              onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white 
                         hover:bg-white/20 transition-colors disabled:opacity-50"
              title="批量修改可见性"
            >
              <Eye size={16} />
              <span className="hidden sm:inline">可见性</span>
            </button>

            {/* Visibility dropdown */}
            {showVisibilityMenu && (
              <div 
                className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-lg 
                           border overflow-hidden min-w-[140px]"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <button
                  onClick={() => handleBatchVisibility('public')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <Eye size={14} />
                  <span>公开</span>
                </button>
                <button
                  onClick={() => handleBatchVisibility('followers')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <Users size={14} />
                  <span>仅关注者</span>
                </button>
                <button
                  onClick={() => handleBatchVisibility('private')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <EyeOff size={14} />
                  <span>私密</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-px h-6 bg-white/30" />

        {/* Clear selection */}
        <button
          onClick={onClearSelection}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white 
                     hover:bg-white/20 transition-colors"
          title="清除选择"
        >
          <X size={16} />
        </button>
      </div>

      {/* Series Modal */}
      {showSeriesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div 
            className="rounded-xl p-6 w-full max-w-md"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              添加到系列
            </h3>

            <div className="space-y-2 mb-4">
              {series.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>还没有创建系列</p>
              ) : (
                series.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSeriesId(s.id)}
                    className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-colors
                              ${selectedSeriesId === s.id ? 'ring-2 ring-primary' : ''}`}
                    style={{ 
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: selectedSeriesId === s.id ? 'var(--primary)' : 'var(--border-color)'
                    }}
                  >
                    <span className="text-lg">{s.icon || '📚'}</span>
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {s.memories_count || 0} 条记忆
                      </div>
                    </div>
                    {selectedSeriesId === s.id && (
                      <CheckSquare size={18} className="ml-auto text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSeriesModal(false);
                  setSelectedSeriesId('');
                }}
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                取消
              </button>
              <button
                onClick={handleAddToSeries}
                disabled={loading || !selectedSeriesId}
                className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-50"
              >
                {loading ? '处理中...' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collection Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div 
            className="rounded-xl p-6 w-full max-w-md"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              添加到收藏夹
            </h3>

            <div className="space-y-2 mb-4">
              {collections.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>还没有创建收藏夹</p>
              ) : (
                collections.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCollectionId(c.id)}
                    className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-colors
                              ${selectedCollectionId === c.id ? 'ring-2 ring-primary' : ''}`}
                    style={{ 
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: selectedCollectionId === c.id ? 'var(--primary)' : 'var(--border-color)'
                    }}
                  >
                    <span className="text-lg">{c.icon || '📁'}</span>
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {c.memories_count || 0} 条记忆
                      </div>
                    </div>
                    {selectedCollectionId === c.id && (
                      <CheckSquare size={18} className="ml-auto text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCollectionModal(false);
                  setSelectedCollectionId('');
                }}
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                取消
              </button>
              <button
                onClick={handleAddToCollection}
                disabled={loading || !selectedCollectionId}
                className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-50"
              >
                {loading ? '处理中...' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BatchOperationsToolbar;