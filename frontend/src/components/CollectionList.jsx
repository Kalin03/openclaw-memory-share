import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';

const CollectionList = ({ userId, isOwn, onSelectCollection }) => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', icon: '📁', is_public: false });
  const { showToast } = useToast();

  const iconOptions = ['📁', '📚', '💡', '⭐', '❤️', '🔥', '🎯', '💎', '🌟', '🚀', '📌', '🎨'];

  useEffect(() => {
    fetchCollections();
  }, [userId]);

  const fetchCollections = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = isOwn ? '/api/collections' : `/api/users/${userId}/collections`;
      const res = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok) {
        setCollections(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('获取收藏夹列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
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
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        showToast('收藏夹创建成功', 'success');
        setCollections([data, ...collections]);
        setShowCreateModal(false);
        setFormData({ name: '', description: '', icon: '📁', is_public: false });
      } else {
        showToast(data.error || '创建失败', 'error');
      }
    } catch (error) {
      showToast('创建失败', 'error');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('请输入收藏夹名称', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/collections/${editingCollection.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        showToast('收藏夹更新成功', 'success');
        setCollections(collections.map(c => c.id === data.id ? data : c));
        setEditingCollection(null);
        setFormData({ name: '', description: '', icon: '📁', is_public: false });
      } else {
        showToast(data.error || '更新失败', 'error');
      }
    } catch (error) {
      showToast('更新失败', 'error');
    }
  };

  const handleDelete = async (collectionId) => {
    if (!window.confirm('确定要删除此收藏夹吗？收藏夹中的记忆不会被删除。')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/collections/${collectionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        showToast('收藏夹已删除', 'success');
        setCollections(collections.filter(c => c.id !== collectionId));
      } else {
        showToast(data.error || '删除失败', 'error');
      }
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  const openEditModal = (collection) => {
    setEditingCollection(collection);
    setFormData({
      name: collection.name,
      description: collection.description || '',
      icon: collection.icon || '📁',
      is_public: collection.is_public === 1
    });
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          收藏夹 ({collections.length})
        </h3>
        {isOwn && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            + 新建收藏夹
          </button>
        )}
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {isOwn ? '还没有收藏夹，点击上方按钮创建一个吧' : '暂无公开的收藏夹'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {collections.map(collection => (
            <div
              key={collection.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => onSelectCollection && onSelectCollection(collection)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl">{collection.icon || '📁'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {collection.name}
                      </h4>
                      {collection.is_public === 1 && (
                        <span className="text-xs bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">
                          公开
                        </span>
                      )}
                    </div>
                    {collection.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {collection.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {collection.memories_count || 0} 条记忆
                    </p>
                  </div>
                </div>
                {isOwn && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(collection); }}
                      className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                      title="编辑"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(collection.id); }}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      title="删除"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingCollection) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              {editingCollection ? '编辑收藏夹' : '新建收藏夹'}
            </h3>
            <form onSubmit={editingCollection ? handleUpdate : handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    名称 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    placeholder="输入收藏夹名称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    图标
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {iconOptions.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`text-2xl p-2 rounded-lg transition-colors ${
                          formData.icon === icon
                            ? 'bg-red-100 dark:bg-red-900 ring-2 ring-red-500'
                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 resize-none"
                    rows={3}
                    placeholder="添加描述（可选）"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500"
                  />
                  <label htmlFor="is_public" className="text-sm text-gray-700 dark:text-gray-300">
                    公开收藏夹（其他人可以查看）
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCollection(null);
                    setFormData({ name: '', description: '', icon: '📁', is_public: false });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  {editingCollection ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionList;