import React, { useState, useEffect } from 'react';
import { List, ChevronRight } from 'lucide-react';

const TableOfContents = ({ content, activeId, onItemClick }) => {
  const [headings, setHeadings] = useState([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (!content) {
      setHeadings([]);
      return;
    }

    // 从 Markdown 内容提取标题
    const lines = content.split('\n');
    const extractedHeadings = [];
    
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = `heading-${index}`;
        extractedHeadings.push({ level, text, id, line: index + 1 });
      }
    });

    setHeadings(extractedHeadings);
  }, [content]);

  if (headings.length === 0) {
    return null;
  }

  const getIndentClass = (level) => {
    switch (level) {
      case 1: return 'pl-0';
      case 2: return 'pl-3';
      case 3: return 'pl-6';
      default: return 'pl-0';
    }
  };

  return (
    <div 
      className="sticky top-20"
      style={{ maxWidth: '240px' }}
    >
      <div 
        className="rounded-lg border overflow-hidden"
        style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          borderColor: 'var(--border-color)' 
        }}
      >
        {/* Header */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 border-b transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-2">
            <List size={16} style={{ color: 'var(--text-secondary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              目录
            </span>
            <span 
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              {headings.length}
            </span>
          </div>
          <ChevronRight 
            size={16} 
            className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}
            style={{ color: 'var(--text-secondary)' }}
          />
        </button>

        {/* Content */}
        {isOpen && (
          <nav className="max-h-[50vh] overflow-y-auto py-2">
            {headings.map((heading, index) => (
              <button
                key={index}
                onClick={() => {
                  // 滚动到对应位置
                  const elements = document.querySelectorAll('h1, h2, h3');
                  if (elements[heading.line - 1]) {
                    elements[heading.line - 1].scrollIntoView({ behavior: 'smooth' });
                  }
                  if (onItemClick) onItemClick(heading);
                }}
                className={`w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-primary/10 hover:text-primary ${
                  activeId === heading.id ? 'text-primary bg-primary/5' : ''
                } ${getIndentClass(heading.level)}`}
                style={{ color: activeId === heading.id ? undefined : 'var(--text-secondary)' }}
              >
                <span className="line-clamp-1">{heading.text}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
};

export default TableOfContents;