import React, { useState } from 'react';
import { Lock, Unlock, Eye, EyeOff, X } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const LockMemoryModal = ({ memoryId, isLocked, onLockChange, onClose }) => {
  const [mode, setMode] = useState(isLocked ? 'unlock' : 'lock');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (mode === 'lock') {
      if (password.length < 4) {
        setError('密码至少需要4个字符');
        return;
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      if (mode === 'lock') {
        await axios.post(`${API_URL}/memories/${memoryId}/lock`, 
          { password },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        onLockChange && onLockChange(true);
      } else {
        await axios.post(`${API_URL}/memories/${memoryId}/unlock`, 
          { password },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        onLockChange && onLockChange(false);
      }
      
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-xl w-full max-w-md overflow-hidden"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            {mode === 'lock' ? (
              <Lock size={24} className="text-primary" />
            ) : (
              <Unlock size={24} className="text-primary" />
            )}
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {mode === 'lock' ? '锁定记忆' : '解锁记忆'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'lock' ? (
            <>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                设置密码后，查看此记忆需要输入密码验证。
              </p>
              
              <div>
                <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
                  设置密码 *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少4个字符"
                    className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
                  确认密码 *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                输入密码解锁此记忆，解锁后将移除密码保护。
              </p>
              
              <div>
                <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
                  输入密码 *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入锁定密码"
                    className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </>
          )}
          
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg hover:opacity-80"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-4 py-2 disabled:opacity-50"
            >
              {loading ? '处理中...' : (mode === 'lock' ? '锁定' : '解锁')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// View locked memory modal
export const ViewLockedMemoryModal = ({ memoryId, memoryTitle, onVerified, onClose }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await axios.post(`${API_URL}/memories/${memoryId}/verify-lock`, { password });
      onVerified && onVerified(res.data.memory);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || '密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-xl w-full max-w-md overflow-hidden"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <Lock size={24} className="text-primary" />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              此记忆已锁定
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {memoryTitle && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              「{memoryTitle}」需要密码才能查看
            </p>
          )}
          
          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
              输入密码 *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入查看密码"
                className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg hover:opacity-80"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-4 py-2 disabled:opacity-50"
            >
              {loading ? '验证中...' : '查看'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LockMemoryModal;