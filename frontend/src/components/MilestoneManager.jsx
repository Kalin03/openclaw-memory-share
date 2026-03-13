import React, { useState, useEffect } from 'react';
import { X, Flag, Plus, Edit2, Trash2, Calendar, Target, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = '/api';

const MilestoneManager = ({ onClose }) => {
  const navigate = useNavigate();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [milestoneMemories, setMilestoneMemories] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetDate: '',
    status: 'active'
  });

  useEffect(() => {
    fetchMilestones();
  }, []);

  const fetchMilestones = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/milestones`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMilestones(res.data.milestones);
    } catch (error) {
      console.error('获取里程碑列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMilestoneDetails = async (milestoneId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/milestones/${milestoneId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedMilestone(res.data.milestone);
      setMilestoneMemories(res.data.memories);
    } catch (error) {
      console.error('获取里程碑详情失败:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (editingMilestone) {
        await axios.put(`${API_URL}/milestones/${editingMilestone.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/milestones`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      setShowCreate(false);
      setEditingMilestone(null);
      resetForm();
      fetchMilestones();
    } catch (error) {
      console.error('保存里程碑失败:', error);
      alert(error.response?.data?.error || '保存失败');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个里程碑吗？')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/milestones/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMilestones();
    } catch (error) {
      console.error('删除里程碑失败:', error);
    }
  };

  const handleEdit = (milestone) => {
    setEditingMilestone(milestone);
    setFormData({
      title: milestone.title,
      description: milestone.description || '',
      targetDate: milestone.target_date ? milestone.target_date.slice(0, 10) : '',
      status: milestone.status
    });
    setShowCreate(true);
  };

  const handleComplete = async (milestone) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/milestones/${milestone.id}`, {
        ...milestone,
        status: 'completed'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMilestones();
    } catch (error) {
      console.error('完成里程碑失败:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      targetDate: '',
      status: 'active'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'cancelled': return 'text-red-500';
      default: return 'text-blue-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} className="text-green-500" />;
      case 'cancelled': return <X size={16} className="text-red-500" />;
      default: return <Clock size={16} className="text-blue-500" />;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const isOverdue = (targetDate, status) => {
    if (!targetDate || status !== 'active') return false;
    return new Date(targetDate) < new Date();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <Flag size={24} className="text-primary" />
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {selectedMilestone ? selectedMilestone.title : '里程碑'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {selectedMilestone && (
              <button
                onClick={() => {
                  setSelectedMilestone(null);
                  setMilestoneMemories([]);
                }}
                className="px-3 py-1.5 text-sm rounded-lg hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                返回列表
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : selectedMilestone ? (
            /* Milestone Details */
            <div>
              <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{selectedMilestone.description}</p>
                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {selectedMilestone.target_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      目标日期: {formatDate(selectedMilestone.target_date)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Target size={12} />
                    {milestoneMemories.length} 条记忆
                  </span>
                </div>
              </div>
              
              <h4 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>关联记忆</h4>
              {milestoneMemories.length === 0 ? (
                <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                  暂无关联记忆，在记忆卡片中可以添加到里程碑
                </p>
              ) : (
                <div className="space-y-2">
                  {milestoneMemories.map(memory => (
                    <div
                      key={memory.id}
                      onClick={() => {
                        onClose();
                        navigate(`/memory/${memory.id}`);
                      }}
                      className="p-3 rounded-lg cursor-pointer hover:opacity-90 transition-colors flex items-center justify-between"
                      style={{ backgroundColor: 'var(--bg-secondary)' }}
                    >
                      <div>
                        <h5 className="font-medium" style={{ color: 'var(--text-primary)' }}>{memory.title || '无标题'}</h5>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {formatDate(memory.created_at)}
                        </p>
                      </div>
                      <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Milestone List */
            <>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  共 {milestones.length} 个里程碑
                </p>
                <button
                  onClick={() => {
                    resetForm();
                    setEditingMilestone(null);
                    setShowCreate(true);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={18} />
                  新建里程碑
                </button>
              </div>

              {/* Create/Edit Form */}
              {showCreate && (
                <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                        标题 *
                      </label>
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
                      <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                        描述
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                          目标日期
                        </label>
                        <input
                          type="date"
                          value={formData.targetDate}
                          onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                          状态
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        >
                          <option value="active">进行中</option>
                          <option value="completed">已完成</option>
                          <option value="cancelled">已取消</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreate(false);
                          setEditingMilestone(null);
                        }}
                        className="px-4 py-2 rounded-lg hover:opacity-80"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                      >
                        取消
                      </button>
                      <button type="submit" className="btn-primary px-4 py-2">
                        {editingMilestone ? '更新' : '创建'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {milestones.length === 0 ? (
                <div className="text-center py-12">
                  <Flag size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--text-secondary)' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>暂无里程碑</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {milestones.map(milestone => (
                    <div
                      key={milestone.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        isOverdue(milestone.target_date, milestone.status) ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : ''
                      }`}
                      style={{ 
                        backgroundColor: milestone.status === 'completed' ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                        borderColor: milestone.status === 'completed' ? 'var(--border-color)' : undefined
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => fetchMilestoneDetails(milestone.id)}
                        >
                          <div className="flex items-center gap-2">
                            {getStatusIcon(milestone.status)}
                            <h4 
                              className={`font-medium ${milestone.status === 'completed' ? 'line-through opacity-50' : ''}`}
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {milestone.title}
                            </h4>
                          </div>
                          {milestone.description && (
                            <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                              {milestone.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {milestone.target_date && (
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {formatDate(milestone.target_date)}
                                {isOverdue(milestone.target_date, milestone.status) && (
                                  <span className="text-red-500 ml-1">(已过期)</span>
                                )}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Target size={12} />
                              {milestone.memory_count} 条记忆
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {milestone.status === 'active' && (
                            <button
                              onClick={() => handleComplete(milestone)}
                              className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 text-green-600"
                              title="标记完成"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(milestone)}
                            className="p-2 rounded-lg hover:opacity-80"
                            style={{ color: 'var(--text-secondary)' }}
                            title="编辑"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(milestone.id)}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MilestoneManager;