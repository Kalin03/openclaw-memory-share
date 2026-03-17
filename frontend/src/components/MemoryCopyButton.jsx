import React, { useState } from 'react';
import { Copy, Loader2, Check, Edit3 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

/**
 * 记忆复制组件
 * 支持复制单条记忆或批量复制
 */
const MemoryCopyButton = ({ memory, selectedIds, onCopy, size = 'normal', showLabel = true }) => {
  const { success, error } = useToast();
  const [copying, setCopying] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleCopy = async (openForEdit = false) => {
    setCopying(true);
    setShowOptions(false);

    try {
      const idsToCopy = selectedIds?.length > 0 ? selectedIds : (memory ? [memory.id] : []);
      
      if (idsToCopy.length === 0) {
        error('请选择要复制的记忆');
        return;
      }

      const res = await axios.post('/api/memories/copy', {
        memoryIds: idsToCopy,
        openForEdit
      });

      if (res.data.success) {
        success(res.data.message);
        onCopy?.(res.data.memories);
        
        // 如果选择编辑，打开编辑模态框
        if (openForEdit && res.data.memories?.length > 0) {
          // 这里可以触发编辑模态框，由父组件处理
          onCopy?.(res.data.memories, true);
        }
      }
    } catch (err) {
      console.error('复制记忆失败:', err);
      error(err.response?.data?.error || '复制失败');
    } finally {
      setCopying(false);
    }
  };

  // 小尺寸按钮（用于卡片操作栏）
  if (size === 'small') {
    return (
      <button
        onClick={() => handleCopy(false)}
        disabled={copying}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        title="复制"
      >
        {copying ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
        ) : (
          <Copy className="w-4 h-4 text-gray-500" />
        )}
      </button>
    );
  }

  // 批量操作按钮
  if (selectedIds?.length > 1) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowOptions(!showOptions)}
          disabled={copying}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          {copying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          <span>复制 {selectedIds.length} 条</span>
        </button>

        {showOptions && (
          <div className="absolute top-full mt-1 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-10 min-w-[160px]">
            <button
              onClick={() => handleCopy(false)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              直接复制
            </button>
            <button
              onClick={() => handleCopy(true)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              复制并编辑
            </button>
          </div>
        )}
      </div>
    );
  }

  // 标准按钮
  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={copying}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
      >
        {copying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
        {showLabel && <span>复制</span>}
      </button>

      {showOptions && (
        <div className="absolute top-full mt-1 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-10 min-w-[160px]">
          <button
            onClick={() => handleCopy(false)}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
          >
            <Copy className="w-4 h-4" />
            直接复制
          </button>
          <button
            onClick={() => handleCopy(true)}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
          >
            <Edit3 className="w-4 h-4" />
            复制并编辑
          </button>
        </div>
      )}
    </div>
  );
};

export default MemoryCopyButton;