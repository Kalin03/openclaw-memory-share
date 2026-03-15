import React, { useState, useEffect } from 'react';
import { 
  Webhook, 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Copy, 
  Clock,
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const WebhookManager = ({ onClose }) => {
  const toast = useToast();
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedWebhook, setSelectedWebhook] = useState(null);
  const [logs, setLogs] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    secret: '',
    events: []
  });

  const availableEvents = [
    { value: 'memory.created', label: '记忆创建', description: '创建新记忆时触发' },
    { value: 'memory.updated', label: '记忆更新', description: '更新记忆时触发' },
    { value: 'memory.deleted', label: '记忆删除', description: '删除记忆时触发' },
    { value: 'comment.created', label: '评论创建', description: '收到新评论时触发' },
    { value: 'like.received', label: '收到点赞', description: '记忆被点赞时触发' },
    { value: 'bookmark.received', label: '收到收藏', description: '记忆被收藏时触发' }
  ];

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/webhooks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWebhooks(res.data.webhooks || []);
    } catch (error) {
      console.error('获取webhooks失败:', error);
      toast.error('获取失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (webhookId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/webhooks/${webhookId}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data.logs || []);
      setSelectedWebhook(webhookId);
    } catch (error) {
      console.error('获取日志失败:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.url || formData.events.length === 0) {
      toast.warning('请填写完整信息');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/webhooks', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('创建成功');
      setShowCreate(false);
      setFormData({ name: '', url: '', secret: '', events: [] });
      fetchWebhooks();
    } catch (error) {
      console.error('创建失败:', error);
      toast.error(error.response?.data?.error || '创建失败');
    }
  };

  const handleUpdate = async (webhookId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/webhooks/${webhookId}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('更新成功');
      setEditingId(null);
      fetchWebhooks();
    } catch (error) {
      console.error('更新失败:', error);
      toast.error('更新失败');
    }
  };

  const handleDelete = async (webhookId) => {
    if (!window.confirm('确定要删除这个Webhook吗？')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/webhooks/${webhookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('删除成功');
      fetchWebhooks();
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    }
  };

  const toggleEvent = (eventValue) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventValue)
        ? prev.events.filter(e => e !== eventValue)
        : [...prev.events, eventValue]
    }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Webhook className="text-primary" size={24} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Webhook 管理</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Description */}
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            <p className="text-sm">
              🔗 Webhook 允许外部系统在特定事件发生时接收通知。可用于自动化工作流、消息推送等场景。
            </p>
          </div>

          {/* Create Button */}
          {!showCreate && (
            <button
              onClick={() => {
                setShowCreate(true);
                setEditingId(null);
                setFormData({ name: '', url: '', secret: '', events: [] });
              }}
              className="w-full py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              <Plus size={20} />
              添加 Webhook
            </button>
          )}

          {/* Create/Edit Form */}
          {(showCreate || editingId) && (
            <div className="p-4 rounded-xl space-y-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  名称
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：飞书通知"
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  URL
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com/webhook"
                  className="w-full px-3 py-2 rounded-lg font-mono text-sm"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Secret（可选，用于验证）
                </label>
                <input
                  type="text"
                  value={formData.secret}
                  onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                  placeholder="your-secret-key"
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  触发事件
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableEvents.map(event => (
                    <label
                      key={event.value}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        formData.events.includes(event.value) ? 'ring-2 ring-primary' : ''
                      }`}
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.events.includes(event.value)}
                        onChange={() => toggleEvent(event.value)}
                        className="rounded"
                      />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {event.label}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {event.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setEditingId(null);
                  }}
                  className="flex-1 py-2 rounded-lg border"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                >
                  取消
                </button>
                <button
                  onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                  className="flex-1 py-2 rounded-lg bg-primary text-white font-medium"
                >
                  {editingId ? '更新' : '创建'}
                </button>
              </div>
            </div>
          )}

          {/* Webhooks List */}
          {loading ? (
            <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              加载中...
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
              <Webhook size={48} className="mx-auto mb-3 opacity-30" />
              <p>暂无 Webhook</p>
              <p className="text-sm mt-1">创建 Webhook 来接收事件通知</p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map(webhook => (
                <div
                  key={webhook.id}
                  className="p-4 rounded-xl border"
                  style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {webhook.name}
                      </h3>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {webhook.url}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => fetchLogs(webhook.id)}
                        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        title="查看日志"
                      >
                        <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(webhook.id);
                          setShowCreate(false);
                          setFormData({
                            name: webhook.name,
                            url: webhook.url,
                            secret: '',
                            events: JSON.parse(webhook.events)
                          });
                        }}
                        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        title="编辑"
                      >
                        <Edit2 size={16} style={{ color: 'var(--text-secondary)' }} />
                      </button>
                      <button
                        onClick={() => handleDelete(webhook.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {JSON.parse(webhook.events).map(event => {
                      const ev = availableEvents.find(e => e.value === event);
                      return (
                        <span
                          key={event}
                          className="px-2 py-0.5 rounded text-xs"
                          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                        >
                          {ev?.label || event}
                        </span>
                      );
                    })}
                  </div>

                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    最后触发: {formatDate(webhook.last_triggered_at)}
                  </div>

                  {/* Logs */}
                  {selectedWebhook === webhook.id && logs.length > 0 && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                        最近调用记录
                      </p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {logs.map(log => (
                          <div key={log.id} className="flex items-center gap-2 text-xs">
                            {log.success ? (
                              <CheckCircle size={12} className="text-green-500" />
                            ) : (
                              <AlertCircle size={12} className="text-red-500" />
                            )}
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {formatDate(log.created_at)}
                            </span>
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {log.response_status || '失败'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebhookManager;