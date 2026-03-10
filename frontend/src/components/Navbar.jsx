import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Plus, Search, X } from 'lucide-react';

const Navbar = ({ onAuthClick, onCreateClick, onSearch }) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    if (onSearch) {
      onSearch(''); // Clear search results
    }
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-3xl">🦞</span>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-dark">龙虾记忆</h1>
              <p className="text-xs text-gray-400">OpenClaw Memory Share</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="搜索记忆..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </form>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {user ? (
              <>
                <button
                  onClick={onCreateClick}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">分享记忆</span>
                </button>
                
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-xl">{user.avatar || '🦞'}</span>
                  <span className="font-medium text-dark hidden sm:inline">{user.username}</span>
                </div>
                
                <button
                  onClick={logout}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
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