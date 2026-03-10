import React, { useState, useEffect } from 'react';
import { useMemories } from '../context/MemoriesContext';
import { useToast } from '../context/ToastContext';
import { X, FileText, Tag } from 'lucide-react';

const EditMemoryModal = ({ memory, onClose }) => {
  const { updateMemory } = useMemories();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: memory?.title || '',
    content: memory?.content || '',
    tags: memory?.tags || ''
  });

  useEffect(() => {
    if (memory) {
      setFormData({
        title: memory.title || '',
        content: memory.content || '',
        tags: memory.tags || ''
      });
    }
  }, [memory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      await updateMemory(memory.id, {
        title: formData.title,
        content: formData.content,
        tags
      });
      toast.success('记忆更新成功！');
      onClose();
    } catch (error) {
      toast.error('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!memory) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white sticky top-0">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X size={24} />
          </button>
          <h2 className="text-2xl font-bold">编辑记忆</h2>
          <p className="text-white/80 mt-1">修改你的记忆内容</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="inline w-4 h-4 mr-1" />
              标题
            </label>
            <input
              type="text"
              className="input-flat"
              placeholder="给你的记忆起个标题"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              内容（支持Markdown）
            </label>
            <textarea
              className="input-flat min-h-[200px] font-mono"
              placeholder="写下你想分享的内容..."
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Tag className="inline w-4 h-4 mr-1" />
              标签（逗号分隔）
            </label>
            <input
              type="text"
              className="input-flat"
              placeholder="例如: OpenClaw, AI, 记忆"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-outline"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {loading ? '保存中...' : '保存修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMemoryModal;