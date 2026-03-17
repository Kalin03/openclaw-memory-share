import React, { useState } from 'react';
import { Palette, Check, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

/**
 * 记忆颜色选择器组件
 * 支持为记忆设置颜色标签
 */
const MemoryColorPicker = ({ memory, onColorChange, size = 'normal' }) => {
  const { success, error } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(memory?.color || null);
  const [loading, setLoading] = useState(false);

  const colors = [
    { id: 'red', name: '红色', bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
    { id: 'orange', name: '橙色', bg: '#FFEDD5', text: '#EA580C', border: '#FDBA74' },
    { id: 'yellow', name: '黄色', bg: '#FEF9C3', text: '#CA8A04', border: '#FDE047' },
    { id: 'green', name: '绿色', bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC' },
    { id: 'teal', name: '青色', bg: '#CCFBF1', text: '#0D9488', border: '#5EEAD4' },
    { id: 'blue', name: '蓝色', bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD' },
    { id: 'indigo', name: '靛蓝', bg: '#E0E7FF', text: '#4F46E5', border: '#A5B4FC' },
    { id: 'purple', name: '紫色', bg: '#F3E8FF', text: '#9333EA', border: '#D8B4FE' },
    { id: 'pink', name: '粉色', bg: '#FCE7F3', text: '#DB2777', border: '#F9A8D4' },
    { id: 'gray', name: '灰色', bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' },
  ];

  const handleColorSelect = async (color) => {
    const newColor = selectedColor === color.id ? null : color.id;
    setSelectedColor(newColor);
    setLoading(true);

    try {
      await axios.patch(`/api/memories/${memory.id}/color`, {
        color: newColor
      });

      success(newColor ? `已设置为${color.name}标签` : '已移除颜色标签');
      onColorChange?.(newColor);
      setIsOpen(false);
    } catch (err) {
      console.error('设置颜色失败:', err);
      error(err.response?.data?.error || '设置颜色失败');
      setSelectedColor(memory?.color || null);
    } finally {
      setLoading(false);
    }
  };

  const handleClearColor = async () => {
    setSelectedColor(null);
    setLoading(true);

    try {
      await axios.patch(`/api/memories/${memory.id}/color`, {
        color: null
      });

      success('已移除颜色标签');
      onColorChange?.(null);
      setIsOpen(false);
    } catch (err) {
      console.error('移除颜色失败:', err);
      error(err.response?.data?.error || '移除颜色失败');
      setSelectedColor(memory?.color || null);
    } finally {
      setLoading(false);
    }
  };

  // 获取当前选中的颜色对象
  const currentColor = colors.find(c => c.id === selectedColor);

  // 小尺寸按钮
  if (size === 'small') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="设置颜色标签"
        >
          <Palette 
            className="w-4 h-4" 
            style={{ color: currentColor?.text || undefined }}
          />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-[180px]">
              <div className="grid grid-cols-5 gap-1.5">
                {colors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => handleColorSelect(color)}
                    disabled={loading}
                    className="w-7 h-7 rounded-md border-2 transition-transform hover:scale-110 disabled:opacity-50"
                    style={{ 
                      backgroundColor: color.bg,
                      borderColor: selectedColor === color.id ? color.text : color.border
                    }}
                    title={color.name}
                  >
                    {selectedColor === color.id && (
                      <Check className="w-4 h-4 mx-auto" style={{ color: color.text }} />
                    )}
                  </button>
                ))}
              </div>
              
              {selectedColor && (
                <button
                  onClick={handleClearColor}
                  disabled={loading}
                  className="w-full mt-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center justify-center gap-1"
                >
                  <X className="w-3 h-3" />
                  移除颜色
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // 标准尺寸
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        <Palette 
          className="w-4 h-4" 
          style={{ color: currentColor?.text || undefined }}
        />
        <span className="text-sm">{currentColor?.name || '颜色标签'}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-1 left-0 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-[220px]">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">选择颜色标签</div>
            <div className="grid grid-cols-5 gap-2">
              {colors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => handleColorSelect(color)}
                  disabled={loading}
                  className="w-9 h-9 rounded-lg border-2 transition-transform hover:scale-110 disabled:opacity-50 flex items-center justify-center"
                  style={{ 
                    backgroundColor: color.bg,
                    borderColor: selectedColor === color.id ? color.text : color.border
                  }}
                  title={color.name}
                >
                  {selectedColor === color.id && (
                    <Check className="w-5 h-5" style={{ color: color.text }} />
                  )}
                </button>
              ))}
            </div>
            
            {selectedColor && (
              <button
                onClick={handleClearColor}
                disabled={loading}
                className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center justify-center gap-1 border-t border-gray-100 dark:border-gray-700 pt-3"
              >
                <X className="w-4 h-4" />
                移除颜色标签
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// 导出颜色配置供其他组件使用
export const MEMORY_COLORS = [
  { id: 'red', name: '红色', bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
  { id: 'orange', name: '橙色', bg: '#FFEDD5', text: '#EA580C', border: '#FDBA74' },
  { id: 'yellow', name: '黄色', bg: '#FEF9C3', text: '#CA8A04', border: '#FDE047' },
  { id: 'green', name: '绿色', bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC' },
  { id: 'teal', name: '青色', bg: '#CCFBF1', text: '#0D9488', border: '#5EEAD4' },
  { id: 'blue', name: '蓝色', bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD' },
  { id: 'indigo', name: '靛蓝', bg: '#E0E7FF', text: '#4F46E5', border: '#A5B4FC' },
  { id: 'purple', name: '紫色', bg: '#F3E8FF', text: '#9333EA', border: '#D8B4FE' },
  { id: 'pink', name: '粉色', bg: '#FCE7F3', text: '#DB2777', border: '#F9A8D4' },
  { id: 'gray', name: '灰色', bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' },
];

export const getMemoryColor = (colorId) => {
  return MEMORY_COLORS.find(c => c.id === colorId);
};

export default MemoryColorPicker;