import React, { useEffect, useCallback } from 'react';
import { X, Minimize2, Sun, Moon, Type, AlignJustify } from 'lucide-react';

const ReadingMode = ({ 
  isOpen, 
  onClose, 
  title, 
  content, 
  author, 
  avatar,
  createdAt 
}) => {
  const [fontSize, setFontSize] = React.useState(18);
  const [lineHeight, setLineHeight] = React.useState(1.8);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 键盘快捷键
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if (e.key === '+' || e.key === '=') {
      setFontSize(prev => Math.min(prev + 2, 28));
    }
    if (e.key === '-') {
      setFontSize(prev => Math.max(prev - 2, 14));
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900">
      {/* Controls */}
      <div 
        className="fixed top-0 left-0 right-0 flex items-center justify-between px-6 py-4 border-b transition-opacity duration-300 hover:opacity-100 opacity-0 group"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="flex items-center gap-4">
          <span className="text-2xl">{avatar || '🦞'}</span>
          <div>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{author}</span>
            <span className="text-sm ml-2" style={{ color: 'var(--text-secondary)' }}>
              {formatDate(createdAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Font size controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFontSize(prev => Math.max(prev - 2, 14))}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              title="缩小字体 ( - )"
            >
              <Type size={16} style={{ color: 'var(--text-secondary)' }} />
            </button>
            <span className="text-sm w-8 text-center" style={{ color: 'var(--text-secondary)' }}>
              {fontSize}
            </span>
            <button
              onClick={() => setFontSize(prev => Math.min(prev + 2, 28))}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              title="放大字体 ( + )"
            >
              <Type size={20} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>

          {/* Line height */}
          <button
            onClick={() => setLineHeight(prev => prev === 1.8 ? 2.2 : 1.8)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title="行间距"
          >
            <AlignJustify size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title="退出阅读模式 (Esc)"
          >
            <X size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div 
        className="h-full overflow-y-auto pt-20 pb-12 px-4 md:px-8 lg:px-16 group"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <article 
          className="max-w-3xl mx-auto"
          style={{ fontSize: `${fontSize}px`, lineHeight }}
        >
          {/* Title */}
          <h1 
            className="text-3xl md:text-4xl font-bold mb-8 leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h1>

          {/* Content */}
          <div 
            className="prose prose-lg max-w-none"
            style={{ color: 'var(--text-secondary)' }}
            dangerouslySetInnerHTML={{ 
              __html: content?.replace(/\n/g, '<br/>') || '' 
            }}
          />
        </article>
      </div>

      {/* Bottom hint */}
      <div 
        className="fixed bottom-0 left-0 right-0 py-3 text-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-primary)' }}
      >
        按 <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">Esc</kbd> 退出阅读模式 · 
        <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">+/-</kbd> 调整字号
      </div>
    </div>
  );
};

export default ReadingMode;