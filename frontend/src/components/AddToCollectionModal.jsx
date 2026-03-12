import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';

const AddToCollectionModal = ({ memoryId, onClose, onUpdated }) => {
  const [collections, setCollections] = useState([]);
  const [memoryCollections, setMemoryCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, [memoryId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all user's collections
      const collectionsRes = await fetch('/api/collections', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const collectionsData = await collectionsRes.json();
      
      // Fetch which collections this memory is in
      const memoryCollectionsRes = await fetch(`/api/memories/${memoryId}/collections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const memoryCollectionsData = await memoryCollectionsRes.json();
      
      if (collectionsRes.ok) {
        setCollections(Array.isArray(collectionsData) ? collectionsData : []);
      }
      if (memoryCollectionsRes.ok) {
        setMemoryCollections(Array.isArray(memoryCollectionsData) ? memoryCollectionsData.map(c => c.id) : []);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCollection = async (collectionId) => {
    const isInCollection = memoryCollections.includes(collectionId);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/collections/${collectionId}/memories/${memoryId}`, {
        method: isInCollection ? 'DELETE' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        if (isInCollection) {
          setMemoryCollections(memoryCollections.filter(id => id !== collectionId));
          showToast('已从收藏夹移除', 'success');
        } else {
          setMemoryCollections([...memoryCollections, collectionId]);
          showToast('已添加到收藏夹', 'success');
        }
        onUpdated && onUpdated();
      } else {
        showToast(data.error || '操作失败', 'error');
      }
    } catch (error) {
      showToast('操作失败', 'error');
    }
  };

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!newCollectionName.trim()) {
      showToast('请输入收藏夹名称', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newCollectionName.trim(), icon: '📁' })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('收藏夹创建成功', 'success');
        setCollections([data, ...collections]);
        // Automatically add to this new collection
        await handleToggleCollection(data.id);
        setShowCreateModal(false);
        setNewCollectionName('');
      } else {
        showToast(data.error || '创建失败', 'error');
      }
    } catch (error) {
      showToast('创建失败', 'error');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">加载中...</div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              添加到收藏夹
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl"
            >
              ×
            </button>
          </div>

          {collections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-4">还没有收藏夹</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                创建收藏夹
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {collections.map(collection => {
                const isInCollection = memoryCollections.includes(collection.id);
                return (
                  <button
                    key={collection.id}
                    onClick={() => handleToggleCollection(collection.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      isInCollection
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700'
                    }`}
                  >
                    <span className="text-xl">{collection.icon || '📁'}</span>
                    <span className="flex-1 text-left text-gray-900 dark:text-gray-100">
                      {collection.name}
                    </span>
                    {isInCollection && (
                      <span className="text-red-500">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {collections.length > 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full mt-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-lg hover:border-red-400 hover:text-red-500 transition-colors"
            >
              + 新建收藏夹
            </button>
          )}
        </div>
      </div>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              新建收藏夹
            </h3>
            <form onSubmit={handleCreateCollection}>
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 mb-4"
                placeholder="收藏夹名称"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  创建并添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AddToCollectionModal;