import React, { useState, useEffect } from 'react';
import { X, Bell, BellOff, Plus, Check, Trash2, Edit2, Clock, Repeat, FileText, Calendar } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const ReminderManager = ({ onClose, memoryId, memoryTitle }) => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    title: memoryTitle || '',
    content: '',
    reminderType: 'once',
    reminderDate: '',
    repeatInterval: 'daily'
  });

  useEffect(() => {
    fetchReminders();
  }, [filter]);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/reminders?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReminders(res.data.reminders);
    } catch (error) {
      console.error('获取提醒列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const data = {
        ...formData,
        memoryId: memoryId || null
      };
      
      if (editingId) {
        await axios.put(`${API_URL}/reminders/${editingId}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/reminders`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      setShowCreate(false);
      setEditingId(null);
      resetForm();
      fetchReminders();
    } catch (error) {
      console.error('保存提醒失败:', error);
    }
  };

  const handleComplete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/reminders/${id}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReminders();
    } catch (error) {
      console.error('完成提醒失败:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个提醒吗？')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/reminders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReminders();
    } catch (error) {
      console.error('删除提醒失败:', error);
    }
  };

  const handleEdit = (reminder) => {
    setEditingId(reminder.id);
    setFormData({
      title: reminder.title,
      content: reminder.content || '',
      reminderType: reminder.reminder_type,
      reminderDate: reminder.reminder_date.slice(0, 16),
      repeatInterval: reminder.repeat_interval || 'daily'
    });
    setShowCreate(true);
  };

  const resetForm = () => {
    setFormData({
      title: memoryTitle || '',
      content: '',
      reminderType: 'once',
      reminderDate: '',
      repeatInterval: 'daily'
    });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const isOverdue = (dateStr, isCompleted) => {
    if (isCompleted) return false;
    return new Date(dateStr) < new Date();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <Bell size={24} className="text-primary" />
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>记忆提醒</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Filter & Actions */}
        <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex gap-2">
            {[
              { value: 'all', label: '全部' },
              { value: 'pending', label: '待提醒' },
              { value: 'overdue', label: '已过期' },
              { value: 'completed', label: '已完成' }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === opt.value ? 'bg-primary text-white' : 'hover:opacity-80'
                }`}
                style={filter !== opt.value ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => {
              resetForm();
              setEditingId(null);
              setShowCreate(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            新建提醒
          </button>
        </div>

        {/* Create/Edit Form */}
        {showCreate && (
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>提醒标题 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  required
                />
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>备注</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>提醒时间 *</label>
                  <input
                    type="datetime-local"
                    value={formData.reminderDate}
                    onChange={(e) => setFormData({ ...formData, reminderDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>提醒类型</label>
                  <select
                    value={formData.reminderType}
                    onChange={(e) => setFormData({ ...formData, reminderType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="once">一次性</option>
                    <option value="recurring">重复</option>
                  </select>
                </div>
              </div>
              
              {formData.reminderType === 'recurring' && (
                <div>
                  <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>重复间隔</label>
                  <select
                    value={formData.repeatInterval}
                    onChange={(e) => setFormData({ ...formData, repeatInterval: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="daily">每天</option>
                    <option value="weekly">每周</option>
                    <option value="monthly">每月</option>
                    <option value="yearly">每年</option>
                  </select>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 rounded-lg hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary px-4 py-2">
                  {editingId ? '更新' : '创建'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reminder List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-12">
              <BellOff size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--text-secondary)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>暂无提醒</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map(reminder => (
                <div
                  key={reminder.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    isOverdue(reminder.reminder_date, reminder.is_completed) ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : ''
                  }`}
                  style={{ 
                    backgroundColor: reminder.is_completed ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    borderColor: reminder.is_completed ? 'var(--border-color)' : undefined
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 
                          className={`font-medium ${reminder.is_completed ? 'line-through opacity-50' : ''}`}
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {reminder.title}
                        </h4>
                        {reminder.reminder_type === 'recurring' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                            <Repeat size={10} />
                            {reminder.repeat_interval === 'daily' ? '每天' : 
                             reminder.repeat_interval === 'weekly' ? '每周' : 
                             reminder.repeat_interval === 'monthly' ? '每月' : '每年'}
                          </span>
                        )}
                      </div>
                      
                      {reminder.content && (
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{reminder.content}</p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDate(reminder.reminder_date)}
                        </span>
                        {reminder.memory_title && (
                          <span className="flex items-center gap-1">
                            <FileText size={12} />
                            {reminder.memory_title}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!reminder.is_completed && (
                        <button
                          onClick={() => handleComplete(reminder.id)}
                          className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 text-green-600"
                          title="完成"
                        >
                          <Check size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(reminder)}
                        className="p-2 rounded-lg hover:opacity-80"
                        style={{ color: 'var(--text-secondary)' }}
                        title="编辑"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(reminder.id)}
                        className="p-2 rounded-lg hover:opacity-80 text-red-500"
                        title="删除"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReminderManager;