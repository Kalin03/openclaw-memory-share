import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, User, Plus, Search, X, Sun, Moon, Clock, Trash2 } from 'lucide-react';
import NotificationBell from './NotificationBell';

const SEARCH_HISTORY_KEY = 'memory-share-search-history';
const MAX_HISTORY = 10;

const Navbar = ({ onAuthClick, onCreateClick, onSearch, onProfileClick }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const searchInputRef = useRef(null);
  const historyRef = useRef(null);

  // Load search history on mount
  useEffect(() => {
    const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load search history:', e);
      }
    }
  }, []);

  // Close history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (historyRef.current && !historyRef.current.contains(e.target) && 
          searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveToHistory = (query) => {
    if (!query.trim()) return;
    
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, MAX_HISTORY);
    setSearchHistory(newHistory);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  const removeFromHistory = (query, e) => {
    e.stopPropagation();
    const newHistory = searchHistory.filter(h => h !== query);
    setSearchHistory(newHistory);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      saveToHistory(searchQuery.trim());
      onSearch(searchQuery.trim());
      setShowHistory(false);
    }
  };

  const handleHistoryClick = (query) => {
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
    setShowHistory(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <nav className="border-b sticky top-0 z-40" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-3xl">🦞</span>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>龙虾记忆</h1>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>OpenClaw Memory Share</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <form onSubmit={handleSearch} className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="搜索记忆..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowHistory(true)}
                className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: 'var(--text-secondary)' }} />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <X size={18} />
                </button>
              )}
            </form>
            
            {/* Search History Dropdown */}
            {showHistory && searchHistory.length > 0 && (
              <div 
                ref={historyRef}
                className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg border z-50"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    <Clock size={12} className="inline mr-1" />
                    搜索历史
                  </span>
                  <button 
                    onClick={clearHistory}
                    className="text-xs hover:text-red-500 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Trash2 size={12} className="inline mr-1" />
                    清空
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {searchHistory.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => handleHistoryClick(item)}
                      className="flex items-center justify-between px-3 py-2 cursor-pointer hover:opacity-80 transition-colors"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-tertiary)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {item}
                      </span>
                      <button
                        onClick={(e) => removeFromHistory(item, e)}
                        className="p-1 hover:opacity-70"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:opacity-80 transition-all"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
              title={isDark ? '切换到亮色模式' : '切换到深色模式'}
            >
              {isDark ? (
                <Sun size={20} className="text-yellow-400" />
              ) : (
                <Moon size={20} style={{ color: 'var(--text-secondary)' }} />
              )}
            </button>

            {/* Notification Bell */}
            <NotificationBell user={user} />

            {user ? (
              <>
                <button
                  onClick={onCreateClick}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">分享记忆</span>
                </button>
                
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:opacity-80 transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)' }} onClick={onProfileClick}>
                  <span className="text-xl">{user.avatar || '🦞'}</span>
                  <span className="font-medium hidden sm:inline" style={{ color: 'var(--text-primary)' }}>{user.username}</span>
                </div>
                
                <button
                  onClick={logout}
                  className="p-2 rounded-lg hover:opacity-80"
                  style={{ color: 'var(--text-secondary)' }}
                  title="退出登录"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <button
                onClick={onAuthClick}
                className="btn-primary flex items-center gap-2"
              >
                <User size={18} />
                登录 / 注册
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;