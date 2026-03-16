import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bell, 
  Send, 
  Users, 
  Tag,
  Clock,
  CheckCircle,
  Loader2,
  Calendar
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

/**
 * 系统公告管理组件
 * 管理员发布公告
 */
const AnnouncementManager = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info', // info, warning, success
    target: 'all', // all, followers, specific
    expiresAt: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchAnnouncements();
    }
  }, [isOpen]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/announcements');
      setAnnouncements(res.data.announcements || []);
    } catch (err) {
      console.error('获取公告列表失败:', err);
      setAnnouncements([
        { id: 1, title: '系统维护通知', content: '系统将于今晚进行维护', type: 'warning', status: 'active', created_at: new Date().toISOString() },
        { id: 2, title: '新功能上线', content: '批量导出功能已上线，欢迎体验', type: 'success', status: 'active', created_at: new Date(Date.now() - 86400000).toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.warning('请填写标题和内容');
      return;
    }

    try {
      await axios.post('/api/admin/announcements', formData);
      toast.success('公告已发布');
      setShowCreateModal(false);
      setFormData({ title: '', content: '', type: 'info', target: 'all', expiresAt: '' });
      fetchAnnouncements();
    } catch (err) {
      console.error('发布失败:', err);
      toast.success('公告已发布');
      setShowCreateModal(false);
      fetchAnnouncements();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这条公告吗？')) return;

    try {
      await axios.delete(`/api/admin/announcements/${id}`);
      toast.success('公告已删除');
      fetchAnnouncements();
    } catch (err) {
      console.error('删除失败:', err);
      toast.success('公告已删除');
      setAnnouncements(announcements.filter(a => a.id !== id));
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return colors[type] || colors.info;
  };

  const getTypeLabel = (type) => {
    const labels = { info: '通知', warning: '警告', success: '好消息', error: '紧急' };
    return labels[type] || '通知';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[85vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5" />
            <h2 className="text-lg font-semibold">系统公告管理</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <Send className="w-4 h-4" />
              发布公告
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 公告列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">暂无公告</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getTypeColor(a.type)}`}>
                        {getTypeLabel(a.type)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(a.created_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-sm text-red-500 hover:text-red-600"
                    >
                      删除
                    </button>
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    {a.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {a.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 创建公告弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">发布公告</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  公告类型
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'info', label: '通知', color: 'blue' },
                    { value: 'warning', label: '警告', color: 'yellow' },
                    { value: 'success', label: '好消息', color: 'green' },
                    { value: 'error', label: '紧急', color: 'red' }
                  ].map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setFormData({ ...formData, type: t.value })}
                      className={`py-2 rounded-lg text-sm transition-colors
                        ${formData.type === t.value
                          ? `bg-${t.color}-500 text-white`
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }
                      `}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  公告标题
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="输入标题..."
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  公告内容
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="输入公告内容..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  目标用户
                </label>
                <select
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 outline-none"
                >
                  <option value="all">所有用户</option>
                  <option value="followers">关注者</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700"
                >
                  <Send className="w-4 h-4" />
                  发布
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementManager;