import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Bookmark, Heart, Share2, 
  MoreHorizontal, ChevronUp, ExternalLink, Flag, Bell,
  Eye, EyeOff, Pin, Archive, Copy, Printer
} from 'lucide-react';

const QuickActionsBar = ({ 
  memory, 
  isOwner,
  isLiked,
  isBookmarked,
  onLike,
  onBookmark,
  onEdit,
  onDelete,
  onShare,
  onReminder,
  onLock,
  onPin,
  onPrint
}) => {
  const [showMore, setShowMore] = useState(false);
  const [isPinned, setIsPinned] = useState(memory?.is_pinned || false);
  const [isLocked, setIsLocked] = useState(memory?.is_locked || false);

  const mainActions = [
    {
      icon: Heart,
      label: isLiked ? '取消点赞' : '点赞',
      onClick: onLike,
      active: isLiked,
      color: isLiked ? 'text-red-500' : undefined
    },
    {
      icon: Bookmark,
      label: isBookmarked ? '取消收藏' : '收藏',
      onClick: onBookmark,
      active: isBookmarked,
      color: isBookmarked ? 'text-yellow-500' : undefined
    },
    {
      icon: Share2,
      label: '分享',
      onClick: onShare
    }
  ];

  const moreActions = [
    {
      icon: Copy,
      label: '复制链接',
      onClick: () => {
        navigator.clipboard.writeText(window.location.href);
        // 可以触发 toast
      }
    },
    {
      icon: Bell,
      label: '设置提醒',
      onClick: onReminder,
      show: isOwner
    },
    {
      icon: Pin,
      label: isPinned ? '取消置顶' : '置顶',
      onClick: () => {
        setIsPinned(!isPinned);
        onPin && onPin(!isPinned);
      },
      active: isPinned,
      show: isOwner
    },
    {
      icon: memory?.is_locked ? Eye : EyeOff,
      label: memory?.is_locked ? '解锁' : '锁定',
      onClick: () => {
        setIsLocked(!isLocked);
        onLock && onLock(!isLocked);
      },
      active: isLocked,
      show: isOwner
    },
    {
      icon: Printer,
      label: '打印',
      onClick: onPrint
    },
    {
      icon: Edit2,
      label: '编辑',
      onClick: onEdit,
      show: isOwner
    },
    {
      icon: Trash2,
      label: '删除',
      onClick: onDelete,
      show: isOwner,
      danger: true
    }
  ].filter(action => action.show !== false);

  return (
    <div 
      className="sticky bottom-0 left-0 right-0 z-40 border-t"
      style={{ 
        backgroundColor: 'var(--bg-primary)', 
        borderColor: 'var(--border-color)' 
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Main Actions */}
          <div className="flex items-center gap-2">
            {mainActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  action.active 
                    ? 'bg-primary/10 text-primary' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                style={action.active ? {} : { color: 'var(--text-primary)' }}
              >
                <action.icon 
                  size={18} 
                  className={action.color}
                  fill={action.active ? 'currentColor' : 'none'}
                />
                <span className="text-sm font-medium hidden sm:inline">{action.label}</span>
              </button>
            ))}

            {/* More Actions Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMore(!showMore)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  showMore ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                style={showMore ? {} : { color: 'var(--text-primary)' }}
              >
                <MoreHorizontal size={18} />
                <span className="text-sm font-medium hidden sm:inline">更多</span>
              </button>

              {/* Dropdown Menu */}
              {showMore && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMore(false)}
                  />
                  
                  {/* Menu */}
                  <div 
                    className="absolute bottom-full left-0 mb-2 w-48 rounded-lg shadow-lg border overflow-hidden z-20"
                    style={{ 
                      backgroundColor: 'var(--bg-primary)', 
                      borderColor: 'var(--border-color)' 
                    }}
                  >
                    {moreActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          action.onClick();
                          setShowMore(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                          action.active ? 'text-primary' : action.danger ? 'text-red-500' : ''
                        }`}
                        style={action.active || action.danger ? {} : { color: 'var(--text-primary)' }}
                      >
                        <action.icon size={16} />
                        <span className="text-sm">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-1">
              <Heart size={14} />
              {memory?.likes_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <Bookmark size={14} />
              {memory?.bookmarks_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={14} />
              {memory?.views_count || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActionsBar;