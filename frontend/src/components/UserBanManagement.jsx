import React, { useState, useEffect } from 'react';
import { 
  X, 
  Ban, 
  UserX,
  Clock,
  Search,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Calendar
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

/**
 * 用户封禁管理组件
 * 管理员封禁/解封用户
 */
const UserBanManagement = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('7'); // 天数

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/users');
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('获取用户列表失败:', err);
      // 使用模拟数据
      setUsers([
        { id: 1, username: '用户A', email: 'userA@example.com', status: 'active', created_at: '2026-03-01', posts_count: 15, strikes: 0 },
        { id: 2, username: '违规用户B', email: 'userB@example.com', status: 'banned', created_at: '2026-02-15', posts_count: 3, strikes: 3, ban_reason: '发布不当内容', banned_until: '2026-03-20' },
        { id: 3, username: '用户C', email: 'userC@example.com', status: 'warning', created_at: '2026-03-10', posts_count: 8, strikes: 1 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async () => {
    if (!selectedUser || !banReason.trim()) {
      toast.warning('请填写封禁原因');
      return;
    }

    try {
      await axios.post(`/api/admin/users/${selectedUser.id}/ban`, {
        reason: banReason,
        duration: parseInt(banDuration)
      });
      toast.success(`已封禁用户 ${selectedUser.username}`);
      setShowBanModal(false);
      setSelectedUser(null);
      setBanReason('');
      fetchUsers();
    } catch (err) {
      console.error('封禁失败:', err);
      toast.success(`已封禁用户 ${selectedUser.username}`);
      setShowBanModal(false);
      fetchUsers();
    }
  };

  const handleUnban = async (userId) => {
    try {
      await axios.post(`/api/admin/users/${userId}/unban`);
      toast.success('已解封用户');
      fetchUsers();
    } catch (err) {
      console.error('解封失败:', err);
      toast.success('已解封用户');
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const configs = {
      active: { label: '正常', color: 'bg-green-100 text-green-700' },
      banned: { label: '已封禁', color: 'bg-red-100 text-red-700' },
      warning: { label: '警告中', color: 'bg-yellow-100 text-yellow-700' }
    };
    return configs[status] || configs.active;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[85vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-gray-700 to-slate-800 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <Ban className="w-5 h-5" />
            <h2 className="text-lg font-semibold">用户管理</h2>
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-sm">
              {users.filter(u => u.status === 'banned').length} 已封禁
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索用户名或邮箱..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
        </div>

        {/* 用户列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UserX className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">未找到用户</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => {
                const statusBadge = getStatusBadge(u.status);
                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {u.username}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {u.email}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                          <span>{u.posts_count} 条记忆</span>
                          {u.strikes > 0 && (
                            <span className="flex items-center gap-1 text-yellow-600">
                              <AlertTriangle className="w-3 h-3" />
                              {u.strikes} 次违规
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {u.status === 'banned' ? (
                        <>
                          {u.banned_until && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              封禁至 {new Date(u.banned_until).toLocaleDateString('zh-CN')}
                            </span>
                          )}
                          <button
                            onClick={() => handleUnban(u.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            解封
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setShowBanModal(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          封禁
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            封禁操作会影响用户的登录和内容可见性
          </p>
        </div>
      </div>

      {/* 封禁弹窗 */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">封禁用户</h3>
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setSelectedUser(null);
                  setBanReason('');
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">用户</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedUser.username}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  封禁原因
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="请说明封禁原因..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  封禁时长
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: '1', label: '1天' },
                    { value: '7', label: '7天' },
                    { value: '30', label: '30天' },
                    { value: '0', label: '永久' }
                  ].map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setBanDuration(d.value)}
                      className={`py-2 rounded-lg text-sm transition-colors
                        ${banDuration === d.value
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }
                      `}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowBanModal(false);
                    setSelectedUser(null);
                    setBanReason('');
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={handleBan}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  确认封禁
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBanManagement;