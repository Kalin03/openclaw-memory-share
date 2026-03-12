import React, { useState, useEffect } from 'react';
import MemoryCard from './MemoryCard';
import { useToast } from '../context/ToastContext';

const CollectionDetail = ({ collectionId, onBack }) => {
  const [collection, setCollection] = useState(null);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { showToast } = useToast();

  useEffect(() => {
    fetchCollection();
  }, [collectionId, page]);

  const fetchCollection = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Fetch collection details
      const collectionRes = await fetch(`/api/collections/${collectionId}`, { headers });
      const collectionData = await collectionRes.json();

      if (!collectionRes.ok) {
        showToast(collectionData.error || '获取收藏夹失败', 'error');
        onBack && onBack();
        return;
      }

      // Fetch memories in collection
      const memoriesRes = await fetch(`/api/collections/${collectionId}/memories?page=${page}&limit=10`, { headers });
      const memoriesData = await memoriesRes.json();

      if (memoriesRes.ok) {
        setCollection(collectionData);
        setMemories(memoriesData.memories || []);
        setTotalPages(memoriesData.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('获取收藏夹详情失败:', error);
      showToast('获取收藏夹详情失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromCollection = async (memoryId) => {
    if (!window.confirm('确定要从此收藏夹中移除这条记忆吗？')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/collections/${collectionId}/memories/${memoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        showToast('已从收藏夹移除', 'success');
        setMemories(memories.filter(m => m.id !== memoryId));
      } else {
        showToast(data.error || '移除失败', 'error');
      }
    } catch (error) {
      showToast('移除失败', 'error');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin text-4xl">🦞</div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">加载中...</p>
      </div>
    );
  }

  if (!collection) {
    return null;
  }

  const isOwner = collection.user_id === JSON.parse(localStorage.getItem('user') || '{}')?.id;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            ← 返回
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{collection.icon || '📁'}</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {collection.name}
                </h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                  <span>by {collection.username}</span>
                  {collection.is_public === 1 && (
                    <span className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-2 py-0.5 rounded text-xs">
                      公开
                    </span>
                  )}
                  <span>{memories.length} 条记忆</span>
                </div>
              </div>
            </div>
            {collection.description && (
              <p className="mt-3 text-gray-600 dark:text-gray-400">
                {collection.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Memories */}
      {memories.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl">
          <span className="text-6xl">📭</span>
          <p className="mt-4 text-gray-500 dark:text-gray-400">收藏夹中还没有记忆</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memories.map(memory => (
              <div key={memory.id} className="relative group">
                <MemoryCard memory={memory} />
                {isOwner && (
                  <button
                    onClick={() => handleRemoveFromCollection(memory.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-2 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    title="从收藏夹移除"
                  >
                    <span className="text-red-500 text-sm">✕</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                上一页
              </button>
              <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CollectionDetail;