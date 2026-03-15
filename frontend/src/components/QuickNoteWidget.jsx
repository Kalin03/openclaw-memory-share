import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  X, 
  Minimize2, 
  Maximize2, 
  Send, 
  Lightbulb, 
  FileText, 
  Link as LinkIcon, 
  Image,
  Mic,
  Calendar,
  Tag,
  Loader2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

/**
 * 快速笔记悬浮按钮组件
 * 屏幕右下角悬浮按钮，点击展开快速笔记面板
 * 支持最小化/展开，拖拽移动
 */
const QuickNoteWidget = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState('private');
  
  // 拖拽状态
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const widgetRef = useRef(null);

  // 快捷输入类型
  const quickTypes = [
    { id: 'note', icon: FileText, label: '笔记', placeholder: '记录你的想法...' },
    { id: 'idea', icon: Lightbulb, label: '灵感', placeholder: '捕捉你的灵感...' },
    { id: 'link', icon: LinkIcon, label: '链接', placeholder: '粘贴链接...' },
    { id: 'todo', icon: Calendar, label: '待办', placeholder: '添加待办事项...' },
  ];
  const [activeType, setActiveType] = useState('note');

  // 从本地存储恢复位置
  useEffect(() => {
    const savedPosition = localStorage.getItem('quickNotePosition');
    if (savedPosition) {
      try {
        setPosition(JSON.parse(savedPosition));
      } catch (e) {
        // 忽略解析错误
      }
    }
  }, []);

  // 保存位置到本地存储
  useEffect(() => {
    localStorage.setItem('quickNotePosition', JSON.stringify(position));
  }, [position]);

  // 拖拽处理
  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('textarea') || e.target.closest('input')) {
      return;
    }
    setIsDragging(true);
    const rect = widgetRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = window.innerWidth - e.clientX + dragOffset.x;
    const newY = window.innerHeight - e.clientY + dragOffset.y;
    
    // 限制在屏幕范围内
    const boundedX = Math.max(20, Math.min(window.innerWidth - 100, newX));
    const boundedY = Math.max(20, Math.min(window.innerHeight - 100, newY));
    
    setPosition({ x: boundedX, y: boundedY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // 提交笔记
  const handleSubmit = async () => {
    if (!user) {
      toast.warning('请先登录');
      return;
    }

    if (!content.trim()) {
      toast.warning('请输入内容');
      return;
    }

    setIsLoading(true);
    try {
      const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      
      await axios.post('/api/memories', {
        title: title.trim() || `快速笔记 - ${new Date().toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        content: content,
        tags: tagArray.join(','),
        visibility: visibility
      });

      toast.success('笔记已保存');
      setContent('');
      setTitle('');
      setTags('');
      setIsOpen(false);
      
      // 触发刷新事件
      window.dispatchEvent(new CustomEvent('memoryCreated'));
    } catch (err) {
      console.error('保存失败:', err);
      toast.error('保存失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + N 打开快速笔记
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setIsOpen(true);
      }
      // Escape 关闭
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // 未登录不显示
  if (!user) return null;

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        onClick={() => !isDragging && setIsOpen(!isOpen)}
        className={`fixed z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300
          ${isOpen 
            ? 'bg-gray-500 hover:bg-gray-600' 
            : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:scale-110'
          }
          ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}
        `}
        style={{
          right: position.x,
          bottom: position.y,
        }}
        title="快速笔记 (Ctrl+N)"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Plus className="w-6 h-6 text-white" />
        )}
      </button>

      {/* 快速笔记面板 */}
      {isOpen && (
        <div
          ref={widgetRef}
          className={`fixed z-[49] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300
            ${isMinimized ? 'w-72' : 'w-96'}
          `}
          style={{
            right: position.x,
            bottom: position.y + 70,
          }}
          onMouseDown={handleMouseDown}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white cursor-move">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              <span className="font-medium">快速笔记</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                title={isMinimized ? '展开' : '最小化'}
              >
                {isMinimized ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                title="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 内容区域 */}
          {!isMinimized && (
            <div className="p-4 space-y-4">
              {/* 快捷类型选择 */}
              <div className="flex gap-2">
                {quickTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setActiveType(type.id)}
                    className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg transition-all
                      ${activeType === type.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }
                    `}
                  >
                    <type.icon className="w-4 h-4" />
                    <span className="text-xs">{type.label}</span>
                  </button>
                ))}
              </div>

              {/* 标题输入 */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="标题（可选）"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />

              {/* 内容输入 */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={quickTypes.find(t => t.id === activeType)?.placeholder || '记录你的想法...'}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all"
              />

              {/* 标签输入 */}
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="标签（逗号分隔）"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all"
                />
              </div>

              {/* 可见性选择 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">可见性</span>
                <div className="flex gap-2">
                  {[
                    { value: 'private', label: '私密' },
                    { value: 'followers', label: '关注者' },
                    { value: 'public', label: '公开' },
                  ].map((v) => (
                    <button
                      key={v.value}
                      onClick={() => setVisibility(v.value)}
                      className={`px-3 py-1 rounded-full text-xs transition-all
                        ${visibility === v.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }
                      `}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 提交按钮 */}
              <button
                onClick={handleSubmit}
                disabled={isLoading || !content.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    保存笔记
                  </>
                )}
              </button>

              {/* 快捷键提示 */}
              <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                按 <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">Ctrl+N</kbd> 快速打开
              </p>
            </div>
          )}
        </div>
      )}

      {/* 拖拽时的遮罩 */}
      {isDragging && (
        <div className="fixed inset-0 z-[48] cursor-grabbing" />
      )}
    </>
  );
};

export default QuickNoteWidget;