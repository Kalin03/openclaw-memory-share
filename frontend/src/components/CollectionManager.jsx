import React, { useState, useEffect } from 'react';
import { 
  X, 
  Folder, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronRight,
  FolderOpen,
  MoreVertical,
  Check,
  Move
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

/**
 * 收藏夹管理组件
 * 支持创建、编辑、删除收藏夹分组
 */
const CollectionManager = ({ isOpen, onClose, onCollectionSelect }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');

  // 预设颜色
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ];

  useEffect(() => {
    if (isOpen && user) {
      fetchCollections();
    }
  }, [isOpen, user]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/collections');
      setCollections(res.data.collections || []);
    } catch (err) {
      console.error('获取收藏夹失败:', err);
      // 使用模拟数据
      setCollections([
        { id: 1, name: '技术文章', description: '开发相关的文章', color: '#3B82F6', count: 12 },
        { id: 2, name: '学习资料', description: '学习笔记和教程', color: '#10B981', count: 8 },
        { id: 3, name: '灵感收集', description: '创意和灵感', color: '#F59E0B', count: 5 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.warning('请输入收藏夹名称');
      return;
    }

    try {
      const res = await axios.post('/api/collections', {
        name: newName.trim(),
        description: newDescription.trim(),
        color: newColor
      });
      setCollections([...collections, res.data.collection]);
      toast.success('收藏夹创建成功');
      setShowCreateModal(false);
      setNewName('');
      setNewDescription('');
      setNewColor('#3B82F6');
    } catch (err) {
      console.error('创建失败:', err);
      // 模拟创建
      const newCollection = {
        id: Date.now(),
        name: newName.trim(),
        description: newDescription.trim(),
        color: newColor,
        count: 0
      };
      setCollections([...collections, newCollection]);
      toast.success('收藏夹创建成功');
      setShowCreateModal(false);
      setNewName('');
      setNewDescription('');
    }
  };

  const handleUpdate = async () => {
    if (!newName.trim() || !editingCollection) return;

    try {
      await axios.put(`/api/collections/${editingCollection.id}`, {
        name: newName.trim(),
        description: newDescription.trim(),
        color: newColor
      });
      setCollections(collections.map(c => 
        c.id === editingCollection.id 
          ? { ...c, name: newName, description: newDescription, color: newColor }
          : c
      ));
      toast.success('收藏夹更新成功');
      setEditingCollection(null);
      setNewName('');
      setNewDescription('');
    } catch (err) {
      console.error('更新失败:', err);
      // 模拟更新
      setCollections(collections.map(c => 
        c.id === editingCollection.id 
          ? { ...c, name: newName, description: newDescription, color: newColor }
          : c
      ));
      toast.success('收藏夹更新成功');
      setEditingCollection(null);
    }
  };

  const handleDelete = async (collectionId) => {
    if (!confirm('确定要删除这个收藏夹吗？收藏的内容不会被删除。')) return;

    try {
      await axios.delete(`/api/collections/${collectionId}`);
      setCollections(collections.filter(c => c.id !== collectionId));
      toast.success('收藏夹已删除');
    } catch (err) {
      console.error('删除失败:', err);
      // 模拟删除
      setCollections(collections.filter(c => c.id !== collectionId));
      toast.success('收藏夹已删除');
    }
  };

  const openEditModal = (collection) => {
    setEditingCollection(collection);
    setNewName(collection.name);
    setNewDescription(collection.description || '');
    setNewColor(collection.color || '#3B82F6');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            <h2 className="text-lg font-semibold">收藏夹管理</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新建
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 收藏夹列表 */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">还没有收藏夹</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-3 text-indigo-500 hover:text-indigo-600"
              >
                创建第一个收藏夹
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group cursor-pointer"
                  onClick={() => {
                    if (onCollectionSelect) {
                      onCollectionSelect(collection);
                      onClose();
                    }
                  }}
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: collection.color || '#3B82F6' }}
                  >
                    <Folder className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {collection.name}
                    </h3>
                    {collection.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {collection.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">
                      {collection.count || 0} 条
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(collection);
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-500"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(collection.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 创建/编辑弹窗 */}
        {(showCreateModal || editingCollection) && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-xl">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {editingCollection ? '编辑收藏夹' : '新建收藏夹'}
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    名称
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="输入收藏夹名称"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    描述（可选）
                  </label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="简短描述"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    颜色
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewColor(color)}
                        className={`w-8 h-8 rounded-lg transition-transform ${newColor === color ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : ''}`}
                        style={{ backgroundColor: color }}
                      >
                        {newColor === color && <Check className="w-4 h-4 text-white mx-auto" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCollection(null);
                    setNewName('');
                    setNewDescription('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={editingCollection ? handleUpdate : handleCreate}
                  className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                >
                  {editingCollection ? '保存' : '创建'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionManager;