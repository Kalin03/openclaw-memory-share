import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMemories } from '../context/MemoriesContext';
import { useToast } from '../context/ToastContext';
import { X, FileText, Tag, Save, Globe, Lock, Users, Layout, Link2, Sparkles, Wand2 } from 'lucide-react';
import MemoryTemplates, { memoryTemplates } from './MemoryTemplates';
import ReferenceInput from './ReferenceInput';
import AIWritingAssistant from './AIWritingAssistant';
import SmartTagExtractor from './SmartTagExtractor';
import { recommendTags } from '../utils/tagRecommender';

const DRAFT_KEY = 'memory-share-draft';

const visibilityOptions = [
  { value: 'public', label: '公开', icon: Globe, description: '所有人可见' },
  { value: 'followers', label: '仅关注者', icon: Users, description: '仅关注你的人可见' },
  { value: 'private', label: '私密', icon: Lock, description: '仅自己可见' }
];

const CreateMemoryModal = ({ onClose }) => {
  const { user } = useAuth();
  const { createMemory } = useMemories();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [showTemplates, setShowTemplates] = useState(true);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const textareaRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    visibility: 'public'
  });
  const [recommendedTags, setRecommendedTags] = useState([]);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.title || draft.content || draft.tags) {
          setFormData({
            title: draft.title || '',
            content: draft.content || '',
            tags: draft.tags || '',
            visibility: draft.visibility || 'public'
          });
          setHasDraft(true);
          setShowTemplates(false); // 有草稿时隐藏模板选择
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

  // Update recommended tags
  useEffect(() => {
    const timer = setTimeout(() => {
      const existingTags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      const recommendations = recommendTags(formData.content, formData.title, existingTags);
      setRecommendedTags(recommendations);
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.content, formData.title, formData.tags]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  };

  // 处理模板选择
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template.id);
    setFormData({
      title: template.template.title,
      content: template.template.content,
      tags: template.template.tags,
      visibility: 'public'
    });
    setShowTemplates(false);
    if (template.id !== 'blank') {
      toast.success(`已应用「${template.name}」模板`);
    }
  };

  // 重新选择模板
  const handleReselectTemplate = () => {
    setShowTemplates(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      await createMemory({
        title: formData.title,
        content: formData.content,
        tags,
        visibility: formData.visibility
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
      setFormData({ title: '', content: '', tags: '', visibility: 'public' });
      clearDraft();
      setSelectedTemplate('blank');
      setShowTemplates(true);
      toast.success('草稿已清除');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-secondary to-primary p-6 text-white sticky top-0 rounded-t-2xl z-10">
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
          {/* 模板选择区域 */}
          {showTemplates ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  选择模板开始
                </label>
              </div>
              <MemoryTemplates 
                selectedTemplate={selectedTemplate}
                onSelect={handleTemplateSelect}
              />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                选择模板后将自动填充内容框架，你可以自由修改
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  当前模板：{memoryTemplates.find(t => t.id === selectedTemplate)?.name || '空白模板'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleReselectTemplate}
                className="text-sm text-primary hover:underline"
                style={{ color: '#e8572b' }}
              >
                更换模板
              </button>
            </div>
          )}

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
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
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
              placeholder="写下你想分享的内容...&#10;&#10;💡 提示：输入 [[ 可引用其他记忆"
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              required
            />
            <ReferenceInput
              content={formData.content}
              onInsert={(newContent) => setFormData({...formData, content: newContent})}
              textareaRef={textareaRef}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              <Link2 className="inline w-3 h-3 mr-1" />
              输入 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">[[</code> 可搜索并引用其他记忆
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                <Tag className="inline w-4 h-4 mr-1" />
                标签（逗号分隔）
              </label>
              <SmartTagExtractor 
                content={formData.content}
                existingTags={formData.tags.split(',').map(t => t.trim()).filter(Boolean)}
                onTagsAdd={(tags) => setFormData({...formData, tags: tags.join(', ')})}
              />
            </div>
            <input
              type="text"
              className="input-flat"
              placeholder="例如: OpenClaw, AI, 记忆"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
            />
            
            {/* Recommended Tags */}
            {recommendedTags.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-1 text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Sparkles size={12} />
                  <span>推荐标签</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recommendedTags.map(item => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => {
                        const currentTags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
                        if (!currentTags.includes(item.tag)) {
                          const newTags = [...currentTags, item.tag].join(', ');
                          setFormData({...formData, tags: newTags});
                        }
                      }}
                      className="px-2 py-1 rounded-full text-xs transition-all hover:bg-primary/20 hover:text-primary"
                      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                    >
                      {item.tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 可见性选择 */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
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
                    style={{ backgroundColor: isSelected ? 'rgba(232, 87, 43, 0.1)' : 'var(--bg-secondary)' }}
                  >
                    <Icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-primary' : ''}`} style={{ color: isSelected ? '#e8572b' : 'var(--text-secondary)' }} />
                    <div className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`} style={{ color: isSelected ? '#e8572b' : 'var(--text-primary)' }}>
                      {option.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {option.description}
                    </div>
                  </button>
                );
              })}
            </div>
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

export default CreateMemoryModal;