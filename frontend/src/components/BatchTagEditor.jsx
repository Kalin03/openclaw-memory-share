import React, { useState, useEffect } from 'react';
import { X, Tag, Plus, Minus, RefreshCw, Loader2 } from 'lucide-react';
import axios from 'axios';

/**
 * 批量标签编辑组件
 * 支持对选中的记忆批量添加、删除、替换标签
 */
const BatchTagEditor = ({ isOpen, onClose, selectedIds, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('add'); // add, remove, replace
  const [tags, setTags] = useState([]);
  const [inputTag, setInputTag] = useState('');
  const [replaceFrom, setReplaceFrom] = useState('');
  const [replaceTo, setReplaceTo] = useState('');
  const [popularTags, setPopularTags] = useState([]);
  const [preview, setPreview] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPopularTags();
      setTags([]);
      setInputTag('');
      setReplaceFrom('');
      setReplaceTo('');
      setPreview(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedIds.length > 0 && isOpen) {
      fetchPreview();
    }
  }, [selectedIds, tags, mode, replaceFrom, replaceTo, isOpen]);

  const fetchPopularTags = async () => {
    try {
      const res = await axios.get('/api/tags/popular?limit=10');
      setPopularTags(res.data.tags || []);
    } catch (err) {
      console.error('获取热门标签失败:', err);
    }
  };

  const fetchPreview = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      const res = await axios.post('/api/memories/batch-tags/preview', {
        memoryIds: selectedIds,
        tags,
        mode,
        replaceFrom,
        replaceTo
      });
      setPreview(res.data);
    } catch (err) {
      console.error('获取预览失败:', err);
    }
  };

  const handleAddTag = () => {
    const trimmed = inputTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setInputTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handlePopularTagClick = (tag) => {
    if (mode === 'add' || mode === 'remove') {
      if (!tags.includes(tag)) {
        setTags([...tags, tag]);
      }
    } else if (mode === 'replace') {
      if (!replaceFrom) {
        setReplaceFrom(tag);
      } else if (!replaceTo) {
        setReplaceTo(tag);
      }
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;
    
    // 验证
    if (mode === 'add' || mode === 'remove') {
      if (tags.length === 0) {
        alert('请至少选择一个标签');
        return;
      }
    } else if (mode === 'replace') {
      if (!replaceFrom) {
        alert('请输入要替换的原标签');
        return;
      }
    }

    setProcessing(true);
    try {
      const res = await axios.post('/api/memories/batch-tags', {
        memoryIds: selectedIds,
        tags,
        mode,
        replaceFrom,
        replaceTo
      });

      if (res.data.success) {
        onSuccess?.(res.data);
        onClose();
      }
    } catch (err) {
      console.error('批量编辑标签失败:', err);
      alert(err.response?.data?.error || '操作失败');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
          <div className="flex items-center gap-3">
            <Tag className="w-5 h-5" />
            <h2 className="text-lg font-semibold">批量编辑标签</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm bg-white/20 px-2 py-1 rounded">
              {selectedIds.length} 条记忆
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-5 space-y-4">
          {/* 模式选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              操作模式
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => { setMode('add'); setTags([]); }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors
                  ${mode === 'add' 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-600' 
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}
              >
                <Plus className="w-4 h-4" />
                添加标签
              </button>
              <button
                onClick={() => { setMode('remove'); setTags([]); }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors
                  ${mode === 'remove' 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-600' 
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}
              >
                <Minus className="w-4 h-4" />
                删除标签
              </button>
              <button
                onClick={() => { setMode('replace'); setReplaceFrom(''); setReplaceTo(''); }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors
                  ${mode === 'replace' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600' 
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}
              >
                <RefreshCw className="w-4 h-4" />
                替换标签
              </button>
            </div>
          </div>

          {/* 标签输入 */}
          {mode === 'add' || mode === 'remove' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {mode === 'add' ? '要添加的标签' : '要删除的标签'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputTag}
                  onChange={(e) => setInputTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入标签后按回车"
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  添加
                </button>
              </div>
              
              {/* 已选标签 */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-orange-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  原标签
                </label>
                <input
                  type="text"
                  value={replaceFrom}
                  onChange={(e) => setReplaceFrom(e.target.value)}
                  placeholder="要被替换的标签"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  新标签（可选，留空则删除原标签）
                </label>
                <input
                  type="text"
                  value={replaceTo}
                  onChange={(e) => setReplaceTo(e.target.value)}
                  placeholder="替换后的标签"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* 热门标签 */}
          {popularTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                热门标签（点击快速选择）
              </label>
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <button
                    key={tag.name}
                    onClick={() => handlePopularTagClick(tag.name)}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 预览 */}
          {preview && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                操作预览
              </h3>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>将影响 <span className="font-semibold text-gray-900 dark:text-white">{preview.affectedCount || selectedIds.length}</span> 条记忆</p>
                {mode === 'replace' && preview.willRemove && (
                  <p className="text-amber-600">将删除原标签 "{replaceFrom}"</p>
                )}
                {preview.changes && (
                  <p className="text-green-600">{preview.changes}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-5 py-4 bg-gray-50 dark:bg-gray-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={processing || selectedIds.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <Tag className="w-4 h-4" />
                确认修改
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchTagEditor;