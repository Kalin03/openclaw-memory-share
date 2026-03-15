import React, { useState, useEffect, useRef } from 'react';
import { useMemories } from '../context/MemoriesContext';
import { useToast } from '../context/ToastContext';
import { X, FileText, Tag, Globe, Lock, Users, Link2, Wand2 } from 'lucide-react';
import ReferenceInput from './ReferenceInput';
import AIWritingAssistant from './AIWritingAssistant';

const visibilityOptions = [
  { value: 'public', label: '公开', icon: Globe, description: '所有人可见' },
  { value: 'followers', label: '仅关注者', icon: Users, description: '仅关注你的人可见' },
  { value: 'private', label: '私密', icon: Lock, description: '仅自己可见' }
];

const EditMemoryModal = ({ memory, onClose }) => {
  const { updateMemory } = useMemories();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const textareaRef = useRef(null);
  const [formData, setFormData] = useState({
    title: memory?.title || '',
    content: memory?.content || '',
    tags: memory?.tags || '',
    visibility: memory?.visibility || 'public'
  });

  useEffect(() => {
    if (memory) {
      setFormData({
        title: memory.title || '',
        content: memory.content || '',
        tags: memory.tags || '',
        visibility: memory.visibility || 'public'
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
        tags,
        visibility: formData.visibility
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
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">
                内容（支持Markdown）
              </label>
              <button
                type="button"
                onClick={() => setShowAIAssistant(true)}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors"
              >
                <Wand2 size={14} />
                AI 助手
              </button>
            </div>
            <textarea
              ref={textareaRef}
              className="input-flat min-h-[200px] font-mono"
              placeholder="写下你想分享的内容..."
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              required
            />
            <ReferenceInput
              content={formData.content}
              onInsert={(newContent) => setFormData({...formData, content: newContent})}
              textareaRef={textareaRef}
            />
            <p className="text-xs mt-1 text-gray-500">
              <Link2 className="inline w-3 h-3 mr-1" />
              输入 <code className="bg-gray-100 px-1 rounded">[[</code> 可搜索并引用其他记忆
            </p>
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

          {/* 可见性选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              可见性设置
            </label>
            <div className="grid grid-cols-3 gap-2">
              {visibilityOptions.map(option => {
                const Icon = option.icon;
                const isSelected = formData.visibility === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({...formData, visibility: option.value})}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/10' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-primary' : 'text-gray-500'}`} />
                    <div className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-gray-700'}`}>
                      {option.label}
                    </div>
                    <div className="text-xs mt-0.5 text-gray-500">
                      {option.description}
                    </div>
                  </button>
                );
              })}
            </div>
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

      {/* AI Writing Assistant */}
      {showAIAssistant && (
        <AIWritingAssistant
          content={formData.content}
          onApply={(newContent) => setFormData({...formData, content: newContent})}
          onClose={() => setShowAIAssistant(false)}
        />
      )}
    </div>
  );
};

export default EditMemoryModal;