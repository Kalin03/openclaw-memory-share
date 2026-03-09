import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Plus, Home } from 'lucide-react';

const Navbar = ({ onAuthClick, onCreateClick }) => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">🦞</span>
            <div>
              <h1 className="text-xl font-bold text-dark">龙虾记忆</h1>
              <p className="text-xs text-gray-400">OpenClaw Memory Share</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
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