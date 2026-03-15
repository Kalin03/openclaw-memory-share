import React, { useState, useEffect, useRef } from 'react';
import { Eye, Clock, Tag, Heart, MessageCircle, Bookmark, User } from 'lucide-react';

/**
 * 记忆卡片悬停预览组件
 * 当鼠标悬停在记忆卡片上时，显示内容预览弹窗
 */
const MemoryHoverPreview = ({ 
  memory, 
  children,
  delay = 800,      // 悬停延迟（毫秒）
  position = 'right' // 预览位置
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const previewRef = useRef(null);

  // 处理鼠标进入
  const handleMouseEnter = (e) => {
    // 清除隐藏定时器
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // 设置显示定时器
    hoverTimeoutRef.current = setTimeout(() => {
      const rect = e.currentTarget.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let x, y;
      
      // 智能定位：确保预览框在视口内
      if (position === 'right') {
        x = rect.right + 16;
        // 如果右侧空间不足，显示在左侧
        if (x + 400 > viewportWidth) {
          x = rect.left - 416;
        }
      } else if (position === 'left') {
        x = rect.left - 416;
        if (x < 0) {
          x = rect.right + 16;
        }
      } else {
        x = rect.right + 16;
        if (x + 400 > viewportWidth) {
          x = rect.left - 416;
        }
      }
      
      // 垂直位置：与卡片顶部对齐
      y = rect.top;
      
      // 确保不超出视口底部
      if (y + 300 > viewportHeight) {
        y = viewportHeight - 320;
      }
      
      setPreviewPosition({ x, y });
      setShowPreview(true);
    }, delay);
  };

  // 处理鼠标离开
  const handleMouseLeave = () => {
    // 清除显示定时器
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // 延迟隐藏，给用户时间移动到预览框
    hideTimeoutRef.current = setTimeout(() => {
      setShowPreview(false);
    }, 200);
  };

  // 预览框鼠标进入
  const handlePreviewMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  // 预览框鼠标离开
  const handlePreviewMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setShowPreview(false);
    }, 200);
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 截取内容摘要
  const getContentPreview = (content, maxLength = 200) => {
    if (!content) return '暂无内容';
    // 移除 Markdown 标记
    const cleanContent = content
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '[图片]')
      .replace(/\n/g, ' ')
      .trim();
    
    if (cleanContent.length <= maxLength) return cleanContent;
    return cleanContent.slice(0, maxLength) + '...';
  };

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative"
      >
        {children}
      </div>

      {/* 预览弹窗 */}
      {showPreview && (
        <div
          ref={previewRef}
          onMouseEnter={handlePreviewMouseEnter}
          onMouseLeave={handlePreviewMouseLeave}
          className="fixed z-[9999] w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in"
          style={{
            left: previewPosition.x,
            top: previewPosition.y,
          }}
        >
          {/* 标题栏 */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
              {memory.title || '无标题'}
            </h3>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {memory.author_name || memory.username || '匿名'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(memory.created_at)}
              </span>
            </div>
          </div>

          {/* 内容摘要 */}
          <div className="px-4 py-3">
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {getContentPreview(memory.content)}
            </p>
          </div>

          {/* 标签 */}
          {memory.tags && memory.tags.length > 0 && (
            <div className="px-4 pb-3">
              <div className="flex flex-wrap gap-1.5">
                {memory.tags.slice(0, 5).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {typeof tag === 'string' ? tag : tag.name}
                  </span>
                ))}
                {memory.tags.length > 5 && (
                  <span className="text-xs text-gray-400">
                    +{memory.tags.length - 5}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 统计信息 */}
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              {memory.likes_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" />
              {memory.comments_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5" />
              {memory.bookmarks_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {memory.views || 0}
            </span>
          </div>

          {/* 悬停提示 */}
          <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-center">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              点击卡片查看详情
            </span>
          </div>
        </div>
      )}

      {/* 动画样式 */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default MemoryHoverPreview;