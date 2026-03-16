import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  FileText, 
  Calendar, 
  Bookmark, 
  Clock, 
  Archive,
  Flame,
  BarChart3,
  Settings,
  Moon,
  Sun,
  Keyboard,
  Trash2,
  Users,
  Tag,
  Bell,
  Globe,
  Lock,
  HelpCircle,
  Command,
  Trophy,
  Rss,
  Database,
  Inbox,
  Link,
  Webhook,
  Sliders,
  Upload,
  BookOpen,
  FolderOpen,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const CommandPalette = ({ isOpen, onClose, onNavigate }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // 命令列表
  const commands = useMemo(() => {
    const baseCommands = [
      // 内容操作
      { id: 'new-memory', icon: FileText, label: '新建记忆', shortcut: 'N', action: () => onNavigate('new-memory'), category: '内容' },
      { id: 'quick-capture', icon: Inbox, label: '快速收集', shortcut: 'Q', action: () => onNavigate('quick-capture'), category: '内容' },
      { id: 'search', icon: Search, label: '搜索记忆', shortcut: '/', action: () => onNavigate('search'), category: '内容' },
      { id: 'hot', icon: Flame, label: '热门记忆', shortcut: 'H', action: () => onNavigate('hot'), category: '浏览' },
      { id: 'recommendations', icon: Sparkles, label: '智能推荐', action: () => onNavigate('recommendations'), category: '浏览' },
      { id: 'calendar', icon: Calendar, label: '记忆日历', shortcut: 'C', action: () => onNavigate('calendar'), category: '浏览' },
      { id: 'bookmarks', icon: Bookmark, label: '我的收藏', shortcut: 'B', action: () => onNavigate('bookmarks'), category: '我的' },
      { id: 'collections', icon: FolderOpen, label: '收藏夹管理', action: () => onNavigate('collections'), category: '我的' },
      { id: 'read-later', icon: Clock, label: '稍后阅读', shortcut: 'R', action: () => onNavigate('read-later'), category: '我的' },
      { id: 'archives', icon: Archive, label: '已归档', shortcut: 'A', action: () => onNavigate('archives'), category: '我的' },
      { id: 'trash', icon: Trash2, label: '回收站', shortcut: 'T', action: () => onNavigate('trash'), category: '我的' },
      { id: 'badges', icon: Trophy, label: '徽章成就', action: () => onNavigate('badges'), category: '我的' },
      { id: 'rss', icon: Rss, label: 'RSS 订阅', action: () => onNavigate('rss'), category: '我的' },
      { id: 'backup', icon: Database, label: '数据备份', action: () => onNavigate('backup'), category: '我的' },
      { id: 'import', icon: Upload, label: '导入内容', action: () => onNavigate('import'), category: '工具' },
      { id: 'bookmarklet', icon: Link, label: '书签工具', action: () => onNavigate('bookmarklet'), category: '工具' },
      { id: 'webhooks', icon: Webhook, label: 'Webhook 管理', action: () => onNavigate('webhooks'), category: '工具' },
      { id: 'moments', icon: Users, label: '沸点', shortcut: 'M', action: () => onNavigate('moments'), category: '社区' },
      { id: 'tags', icon: Tag, label: '标签管理', shortcut: 'G', action: () => onNavigate('tags'), category: '管理' },
      { id: 'stats', icon: BarChart3, label: '数据统计', shortcut: 'S', action: () => onNavigate('stats'), category: '管理' },
      { id: 'reading-stats', icon: BookOpen, label: '阅读统计', action: () => onNavigate('reading-stats'), category: '管理' },
      { id: 'reminders', icon: Bell, label: '我的提醒', action: () => onNavigate('reminders'), category: '管理' },
      { id: 'graph', icon: Globe, label: '记忆图谱', action: () => onNavigate('graph'), category: '浏览' },
      // 设置
      { id: 'preferences', icon: Sliders, label: '偏好设置', action: () => onNavigate('preferences'), category: '设置' },
      { id: 'theme', icon: theme === 'dark' ? Sun : Moon, label: theme === 'dark' ? '切换亮色模式' : '切换深色模式', shortcut: 'D', action: () => { toggleTheme(); }, category: '设置' },
      { id: 'shortcuts', icon: Keyboard, label: '快捷键帮助', shortcut: '?', action: () => onNavigate('shortcuts'), category: '帮助' },
      { id: 'help', icon: HelpCircle, label: '帮助中心', action: () => onNavigate('help'), category: '帮助' },
    ];

    // 未登录用户隐藏部分命令
    if (!user) {
      return baseCommands.filter(c => !['我的', '管理'].includes(c.category));
    }

    return baseCommands;
  }, [user, theme, toggleTheme, onNavigate]);

  // 过滤命令
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands;
    
    const query = search.toLowerCase();
    return commands.filter(cmd => 
      cmd.label.toLowerCase().includes(query) ||
      cmd.category.toLowerCase().includes(query) ||
      cmd.shortcut?.toLowerCase().includes(query)
    );
  }, [commands, search]);

  // 聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // 键盘导航
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // 滚动到选中项
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // 按类别分组
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[15vh] z-50">
      <div 
        className="w-full max-w-xl rounded-xl shadow-2xl overflow-hidden animate-slide-in"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* 搜索框 */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <Command size={20} className="text-primary" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="搜索命令或输入 / 查看所有..."
              className="flex-1 bg-transparent outline-none text-lg"
              style={{ color: 'var(--text-primary)' }}
            />
            <kbd 
              className="px-2 py-1 rounded text-xs font-mono"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              ESC
            </kbd>
          </div>
        </div>

        {/* 命令列表 */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {Object.entries(groupedCommands).map(([category, cmds]) => (
            <div key={category} className="mb-2">
              <div 
                className="px-3 py-1 text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                {category}
              </div>
              {cmds.map((cmd, index) => {
                const globalIndex = filteredCommands.indexOf(cmd);
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      globalIndex === selectedIndex ? 'bg-primary/10' : ''
                    }`}
                    style={{ 
                      backgroundColor: globalIndex === selectedIndex ? 'var(--bg-secondary)' : 'transparent'
                    }}
                  >
                    <Icon size={18} style={{ color: globalIndex === selectedIndex ? 'var(--primary)' : 'var(--text-secondary)' }} />
                    <span className="flex-1 text-left" style={{ color: 'var(--text-primary)' }}>
                      {cmd.label}
                    </span>
                    {cmd.shortcut && (
                      <kbd 
                        className="px-2 py-0.5 rounded text-xs font-mono"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                      >
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {filteredCommands.length === 0 && (
            <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              未找到匹配的命令
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div 
          className="px-4 py-2 border-t flex items-center justify-between text-xs"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>↑↓</kbd>
              导航
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>↵</kbd>
              选择
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>esc</kbd>
              关闭
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command size={12} />
            命令面板
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;