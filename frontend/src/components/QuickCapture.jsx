import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  X, 
  Send, 
  Trash2, 
  FileText, 
  Check, 
  Loader2,
  Tag,
  Clock
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const QuickCapture = ({ onClose }) => {
  const toast = useToast();
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState([]);
  const [processing, setProcessing] = useState(null);
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'inbox'

  useEffect(() => {
    if (activeTab === 'inbox') {
      fetchNotes();
    }
  }, [activeTab]);

  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/quick-notes?processed=false', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotes(res.data.notes || []);
    } catch (error) {
      console.error('获取笔记失败:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.warning('请输入内容');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/quick-notes', {
        content: content.trim(),
        tags: tags.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('已保存到收集箱');
      setContent('');
      setTags('');
      
      // 刷新收集箱
      if (activeTab === 'inbox') {
        fetchNotes();
      }
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async (note) => {
    setProcessing(note.id);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/quick-notes/${note.id}/convert`, {
        title: note.content.substring(0, 50),
        content: note.content,
        tags: note.tags,
        visibility: 'public'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('已转为记忆');
      fetchNotes();
    } catch (error) {
      console.error('转换失败:', error);
      toast.error('转换失败');
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (noteId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/quick-notes/${noteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('已删除');
      fetchNotes();
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Inbox className="text-primary" size={24} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>快速收集</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'new' ? 'text-primary border-b-2 border-primary' : ''
            }`}
            style={{ color: activeTab === 'new' ? undefined : 'var(--text-secondary)' }}
          >
            ✨ 快速记录
          </button>
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'inbox' ? 'text-primary border-b-2 border-primary' : ''
            }`}
            style={{ color: activeTab === 'inbox' ? undefined : 'var(--text-secondary)' }}
          >
            📥 收集箱
            {notes.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notes.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'new' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="记录想法、灵感、待整理的内容..."
                  className="w-full h-32 px-4 py-3 rounded-lg resize-none outline-none transition-all focus:ring-2 focus:ring-primary/50"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag size={16} style={{ color: 'var(--text-secondary)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>标签（可选，逗号分隔）</span>
                </div>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="例如: 想法, 待整理, 工作"
                  className="w-full px-4 py-2 rounded-lg outline-none transition-all focus:ring-2 focus:ring-primary/50"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !content.trim()}
                className="w-full py-3 rounded-lg bg-primary text-white font-medium transition-colors hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                保存到收集箱
              </button>
            </form>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {notes.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                  <Inbox size={48} className="mx-auto mb-3 opacity-30" />
                  <p>收集箱是空的</p>
                  <p className="text-sm mt-1">快速记录的想法会出现在这里</p>
                </div>
              ) : (
                notes.map(note => (
                  <div
                    key={note.id}
                    className="p-4 rounded-xl border transition-all hover:shadow-md"
                    style={{ 
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)'
                    }}
                  >
                    <p className="mb-2" style={{ color: 'var(--text-primary)' }}>
                      {note.content}
                    </p>
                    
                    {note.tags && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {note.tags.split(',').filter(Boolean).map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-full text-xs"
                            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                          >
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <Clock size={12} />
                        {formatDate(note.created_at)}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => handleConvert(note)}
                          disabled={processing === note.id}
                          className="px-3 py-1 rounded bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          {processing === note.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <FileText size={14} />
                          )}
                          转为记忆
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="px-4 pb-4">
          <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            💡 <strong>提示：</strong>快速收集适合记录临时想法，之后可以在收集箱中整理转为正式记忆。
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickCapture;