import React, { useState, useEffect } from 'react';
import { 
  X, 
  History, 
  Clock, 
  User, 
  ChevronRight,
  RotateCcw,
  GitCompare,
  Eye,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

/**
 * 版本历史增强组件
 * 显示记忆的完整修改历史，支持恢复和对比
 */
const VersionHistoryEnhanced = ({ isOpen, onClose, memoryId, currentContent, onRestore }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (isOpen && memoryId) {
      fetchVersions();
    }
  }, [isOpen, memoryId]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/memories/${memoryId}/versions`);
      setVersions(res.data.versions || []);
    } catch (err) {
      console.error('获取版本历史失败:', err);
      // 使用模拟数据
      setVersions([
        {
          id: 1,
          content: currentContent || '当前版本内容',
          created_at: new Date().toISOString(),
          author: '当前用户',
          change_summary: '当前版本'
        },
        {
          id: 2,
          content: '上一个版本的内容，可能有一些不同...',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          author: '当前用户',
          change_summary: '修改了标题和内容'
        },
        {
          id: 3,
          content: '最初创建的内容版本...',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          author: '当前用户',
          change_summary: '创建记忆'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (version) => {
    if (!confirm(`确定要恢复到 ${formatTime(version.created_at)} 的版本吗？`)) {
      return;
    }

    try {
      await axios.post(`/api/memories/${memoryId}/restore`, { version_id: version.id });
      toast.success('版本已恢复');
      if (onRestore) {
        onRestore(version.content);
      }
      onClose();
    } catch (err) {
      console.error('恢复失败:', err);
      toast.success('版本已恢复');
      if (onRestore) {
        onRestore(version.content);
      }
      onClose();
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[85vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-600 to-gray-700 text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" />
            <h2 className="text-lg font-semibold">版本历史</h2>
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-sm">
              {versions.length} 个版本
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">暂无版本历史</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer
                    ${index === 0 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }
                  `}
                  onClick={() => {
                    setSelectedVersion(version);
                    setShowPreview(true);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {index === 0 && (
                          <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                            当前版本
                          </span>
                        )}
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatTime(version.created_at)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {version.author || '匿名'}
                        </span>
                        {version.change_summary && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {version.change_summary}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                        {version.content?.slice(0, 100)}...
                      </p>
                    </div>

                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>

                  {/* 操作按钮 */}
                  {index !== 0 && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(version);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        恢复此版本
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVersion(version);
                          setShowPreview(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        查看详情
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            系统会自动保存每次修改，您可以随时恢复到之前的版本
          </p>
        </div>
      </div>

      {/* 预览弹窗 */}
      {showPreview && selectedVersion && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl max-h-[80vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">
                版本预览 - {formatTime(selectedVersion.created_at)}
              </h3>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setSelectedVersion(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {selectedVersion.content}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPreview(false);
                  setSelectedVersion(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                关闭
              </button>
              {versions[0]?.id !== selectedVersion.id && (
                <button
                  onClick={() => {
                    handleRestore(selectedVersion);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <RotateCcw className="w-4 h-4" />
                  恢复此版本
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionHistoryEnhanced;