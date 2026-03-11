import React, { useState, useEffect } from 'react';
import { X, History, RotateCcw, Eye, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const API_URL = '/api';

const VersionHistoryModal = ({ isOpen, onClose, memoryId, isOwner, onRestored }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen && memoryId && isOwner) {
      fetchVersions();
    }
  }, [isOpen, memoryId, isOwner]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/memories/${memoryId}/versions`);
      setVersions(res.data);
    } catch (err) {
      console.error('获取版本历史失败:', err);
      toast.error('获取版本历史失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId) => {
    if (!window.confirm('确定要恢复到这个版本吗？当前内容会被保存为新版本。')) {
      return;
    }

    try {
      setRestoring(true);
      await axios.post(`${API_URL}/memories/${memoryId}/versions/${versionId}/restore`);
      toast.success('版本恢复成功');
      onRestored?.();
      onClose();
    } catch (err) {
      console.error('恢复版本失败:', err);
      toast.error('恢复版本失败');
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl shadow-2xl" 
           style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <History className="text-primary" size={20} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>版本历史</h2>
            {versions.length > 0 && (
              <span className="text-sm px-2 py-0.5 rounded-full" 
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                共 {versions.length} 个版本
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-120px)]">
          {/* Version List */}
          <div className="w-1/3 border-r overflow-y-auto" style={{ borderColor: 'var(--border-color)' }}>
            {loading ? (
              <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                加载中...
              </div>
            ) : versions.length === 0 ? (
              <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                <div className="text-4xl mb-2">📝</div>
                <p>暂无历史版本</p>
                <p className="text-xs mt-1">编辑记忆后自动保存版本</p>
              </div>
            ) : (
              <div className="p-2">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    onClick={() => setSelectedVersion(version)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                      selectedVersion?.id === version.id ? 'ring-2 ring-primary' : ''
                    }`}
                    style={{ 
                      backgroundColor: selectedVersion?.id === version.id 
                        ? 'var(--bg-tertiary)' 
                        : 'transparent'
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        版本 {version.version_number}
                      </span>
                      {selectedVersion?.id === version.id && (
                        <Check size={14} className="text-primary" />
                      )}
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                      {version.title}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(version.created_at)}
                    </p>
                    {version.change_summary && (
                      <p className="text-xs mt-1 italic" style={{ color: 'var(--text-secondary)' }}>
                        {version.change_summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Version Preview */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedVersion ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {selectedVersion.title}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewMode(!previewMode)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors"
                      style={{ 
                        backgroundColor: 'var(--bg-tertiary)',
                        color: previewMode ? 'var(--primary)' : 'var(--text-secondary)'
                      }}
                    >
                      <Eye size={14} />
                      {previewMode ? '预览' : '源码'}
                    </button>
                    <button
                      onClick={() => handleRestore(selectedVersion.id)}
                      disabled={restoring}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <RotateCcw size={14} />
                      {restoring ? '恢复中...' : '恢复此版本'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedVersion.tags && selectedVersion.tags.split(',').filter(Boolean).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs rounded-full"
                      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--primary)' }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  {previewMode ? (
                    <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-primary)' }}>
                      <ReactMarkdown>{selectedVersion.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <pre className="text-sm whitespace-pre-wrap break-words" style={{ color: 'var(--text-secondary)' }}>
                      {selectedVersion.content}
                    </pre>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span>可见性: {selectedVersion.visibility === 'public' ? '公开' : 
                               selectedVersion.visibility === 'followers' ? '仅关注者' : '私密'}</span>
                  <span>•</span>
                  <span>保存于 {formatDate(selectedVersion.created_at)}</span>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
                <div className="text-center">
                  <div className="text-4xl mb-2">👈</div>
                  <p>选择一个版本查看详情</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryModal;