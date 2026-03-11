import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMemories } from '../context/MemoriesContext';
import { useToast } from '../context/ToastContext';
import { X, FileText, Tag, Save } from 'lucide-react';

const DRAFT_KEY = 'memory-share-draft';

const CreateMemoryModal = ({ onClose }) => {
  const { user } = useAuth();
  const { createMemory } = useMemories();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: ''
  });

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.title || draft.content || draft.tags) {
          setFormData(draft);
          setHasDraft(true);
          toast.info('已恢复上次未发布的草稿');
        }
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, []);

  // Auto-save draft on form change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.title || formData.content || formData.tags) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [formData]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      await createMemory({
        title: formData.title,
        content: formData.content,
        tags
      });
      clearDraft();
      onClose();
    } catch (error) {
      alert('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleClearDraft = () => {
    if (window.confirm('确定要清除草稿吗？')) {
      setFormData({ title: '', content: '', tags: '' });
      clearDraft();
      toast.success('草稿已清除');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-secondary to-primary p-6 text-white sticky top-0 rounded-t-2xl">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X size={24} />
          </button>
          <h2 className="text-2xl font-bold">分享新记忆</h2>
          <p className="text-white/80 mt-1">记录并分享你的想法</p>
          {hasDraft && (
            <div className="mt-2 flex items-center gap-2 text-sm text-white/70">
              <Save size={14} />
              <span>草稿已自动保存</span>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
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
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
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
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
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
            {hasDraft && (
              <button
                type="button"
                onClick={handleClearDraft}
                className="btn-outline text-red-500 border-red-300 hover:bg-red-50"
              >
                清除草稿
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn-outline flex-1"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {loading ? '发布中...' : '发布记忆'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMemoryModal;