import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Lock, MoreVertical, Edit, Trash2 } from 'lucide-react';

const SeriesCard = ({ series, showActions = false, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleClick = () => {
    navigate(`/series/${series.id}`);
  };

  return (
    <div 
      className="rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all cursor-pointer group relative"
      style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
      onClick={handleClick}
    >
      {/* Cover */}
      <div className="h-32 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <span className="text-5xl">{series.cover || '📚'}</span>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-lg line-clamp-1" style={{ color: 'var(--text-primary)' }}>
            {series.title}
          </h3>
          <div className="flex items-center gap-1">
            {!series.is_public && (
              <Lock size={14} className="text-gray-400" title="私密系列" />
            )}
            {showActions && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical size={16} style={{ color: 'var(--text-secondary)' }} />
                </button>
                
                {showMenu && (
                  <div 
                    className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-10 min-w-[100px]"
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onEdit && onEdit(series);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <Edit size={14} />
                      编辑
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onDelete && onDelete(series.id);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-500 flex items-center gap-2"
                    >
                      <Trash2 size={14} />
                      删除
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {series.description && (
          <p className="text-sm mt-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
            {series.description}
          </p>
        )}
        
        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <BookOpen size={14} />
            <span>{series.memories_count || 0} 条记忆</span>
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            by {series.username}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeriesCard;