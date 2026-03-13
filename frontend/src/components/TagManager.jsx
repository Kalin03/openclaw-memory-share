import React, { useState, useEffect } from 'react';
import { X, Tag, Edit2, Trash2, Merge, Hash, Check, Search } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const TagManager = ({ onClose }) => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTag, setEditingTag] = useState(null);
  const [newTagName, setNewTagName] = useState('');
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [mergeTarget, setMergeTarget] = useState('');

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/tags/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTags(res.data.tags);
    } catch (error) {
      console.error('获取标签列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (oldName) => {
    if (!newTagName.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/tags/${encodeURIComponent(oldName)}/rename`, 
        { newName: newTagName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingTag(null);
      setNewTagName('');
      fetchTags();
    } catch (error) {
      console.error('重命名失败:', error);
      alert(error.response?.data?.error || '重命名失败');
    }
  };

  const handleDelete = async (tagName) => {
    if (!confirm(`确定要删除标签 "#${tagName}" 吗？该标签将从所有相关记忆中移除。`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/tags/${encodeURIComponent(tagName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTags();
    } catch (error) {
      console.error('删除失败:', error);
      alert(error.response?.data?.error || '删除失败');
    }
  };

  const handleMerge = async () => {
    if (!mergeTarget.trim()) {
      alert('请选择目标标签');
      return;
    }
    
    if (selectedTags.length === 0) {
      alert('请选择要合并的标签');
      return;
    }
    
    if (!confirm(`确定要将选中的 ${selectedTags.length} 个标签合并到 "#${mergeTarget}" 吗？`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/tags/merge`, 
        { sourceTags: selectedTags, targetTag: mergeTarget },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowMergeModal(false);
      setSelectedTags([]);
      setMergeTarget('');
      fetchTags();
    } catch (error) {
      console.error('合并失败:', error);
      alert(error.response?.data?.error || '合并失败');
    }
  };

  const toggleTagSelection = (tagName) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <Tag size={24} className="text-primary" />
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>标签管理</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Search & Actions */}
        <div className="px-6 py-3 border-b flex items-center justify-between gap-4" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="搜索标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>
          
          {selectedTags.length > 0 && (
            <button
              onClick={() => setShowMergeModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90"
            >
              <Merge size={18} />
              合并 ({selectedTags.length})
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="px-6 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            共 {tags.length} 个标签，{selectedTags.length > 0 && `已选择 ${selectedTags.length} 个`}
          </p>
        </div>

        {/* Tag List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-12">
              <Hash size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--text-secondary)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>
                {searchQuery ? '没有找到匹配的标签' : '暂无标签'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTags.map(tag => (
                <div
                  key={tag.name}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    selectedTags.includes(tag.name) ? 'border-primary bg-primary/5' : ''
                  }`}
                  style={{ 
                    backgroundColor: selectedTags.includes(tag.name) ? undefined : 'var(--bg-secondary)',
                    borderColor: selectedTags.includes(tag.name) ? undefined : 'var(--border-color)'
                  }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => toggleTagSelection(tag.name)}
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        selectedTags.includes(tag.name) ? 'bg-primary border-primary text-white' : ''
                      }`}
                      style={selectedTags.includes(tag.name) ? {} : { borderColor: 'var(--border-color)' }}
                    >
                      {selectedTags.includes(tag.name) && <Check size={14} />}
                    </button>
                    
                    {editingTag === tag.name ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Hash size={16} style={{ color: 'var(--text-secondary)' }} />
                        <input
                          type="text"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleRename(tag.name)}
                          className="px-3 py-1 text-sm bg-primary text-white rounded hover:opacity-90"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => {
                            setEditingTag(null);
                            setNewTagName('');
                          }}
                          className="px-3 py-1 text-sm rounded hover:opacity-80"
                          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <>
                        <Hash size={16} className="text-primary" />
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {tag.name}
                        </span>
                        <span className="text-sm px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                          {tag.count} 条
                        </span>
                      </>
                    )}
                  </div>
                  
                  {editingTag !== tag.name && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingTag(tag.name);
                          setNewTagName(tag.name);
                        }}
                        className="p-2 rounded-lg hover:opacity-80"
                        style={{ color: 'var(--text-secondary)' }}
                        title="重命名"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(tag.name)}
                        className="p-2 rounded-lg hover:opacity-80 text-red-500"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
          <div 
            className="rounded-xl w-full max-w-md p-6"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              合并标签
            </h3>
            
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              将选中的 {selectedTags.length} 个标签合并到一个目标标签：
            </p>
            
            <div className="mb-4">
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
                目标标签
              </label>
              <select
                value={mergeTarget}
                onChange={(e) => setMergeTarget(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                <option value="">选择目标标签</option>
                {tags.map(tag => (
                  <option key={tag.name} value={tag.name}>#{tag.name}</option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                要合并的标签：
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map(tag => (
                  <span key={tag} className="px-2 py-1 text-sm rounded-full bg-primary/10 text-primary">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowMergeModal(false);
                  setSelectedTags([]);
                  setMergeTarget('');
                }}
                className="px-4 py-2 rounded-lg hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                取消
              </button>
              <button
                onClick={handleMerge}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90"
              >
                确认合并
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagManager;