import React, { useState } from 'react';
import { 
  X, 
  Archive, 
  Trash2, 
  Tag, 
  Move, 
  Copy, 
  Download,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Loader2,
  CheckSquare,
  AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

/**
 * 批量操作增强组件
 * 提供更多批量操作选项
 */
const BatchOperationsEnhanced = ({ 
  isOpen, 
  onClose, 
  selectedIds = [], 
  onOperationComplete 
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [operation, setOperation] = useState(null);
  const [targetTags, setTargetTags] = useState('');
  const [targetCollection, setTargetCollection] = useState('');
  const [targetVisibility, setTargetVisibility] = useState('public');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 操作类型
  const operations = [
    { 
      id: 'add-tags', 
      label: '添加标签', 
      icon: Tag, 
      color: 'text-blue-500',
      description: '为选中的记忆批量添加标签'
    },
    { 
      id: 'archive', 
      label: '批量归档', 
      icon: Archive, 
      color: 'text-orange-500',
      description: '将选中的记忆移入归档'
    },
    { 
      id: 'visibility', 
      label: '修改可见性', 
      icon: Eye, 
      color: 'text-purple-500',
      description: '批量修改记忆的可见性设置'
    },
    { 
      id: 'lock', 
      label: '批量锁定', 
      icon: Lock, 
      color: 'text-red-500',
      description: '锁定选中的记忆，禁止编辑'
    },
    { 
      id: 'duplicate', 
      label: '批量复制', 
      icon: Copy, 
      color: 'text-green-500',
      description: '复制选中的记忆到自己的账户'
    },
    { 
      id: 'delete', 
      label: '批量删除', 
      icon: Trash2, 
      color: 'text-red-600',
      description: '永久删除选中的记忆（不可恢复）',
      danger: true
    }
  ];

  // 执行操作
  const handleOperation = async () => {
    if (!operation) return;

    // 删除操作需要确认
    if (operation.id === 'delete' && !confirmDelete) {
      toast.warning('请确认删除操作');
      return;
    }

    setLoading(true);

    try {
      switch (operation.id) {
        case 'add-tags':
          await handleAddTags();
          break;
        case 'archive':
          await handleArchive();
          break;
        case 'visibility':
          await handleVisibility();
          break;
        case 'lock':
          await handleLock();
          break;
        case 'duplicate':
          await handleDuplicate();
          break;
        case 'delete':
          await handleDelete();
          break;
      }

      toast.success(`已成功处理 ${selectedIds.length} 条记忆`);
      if (onOperationComplete) {
        onOperationComplete(operation.id);
      }
      onClose();
    } catch (err) {
      console.error('操作失败:', err);
      toast.error('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 添加标签
  const handleAddTags = async () => {
    const tags = targetTags.split(',').map(t => t.trim()).filter(Boolean);
    if (tags.length === 0) {
      toast.warning('请输入标签');
      return;
    }
    
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('添加标签:', { ids: selectedIds, tags });
  };

  // 归档
  const handleArchive = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('归档:', selectedIds);
  };

  // 修改可见性
  const handleVisibility = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('修改可见性:', { ids: selectedIds, visibility: targetVisibility });
  };

  // 锁定
  const handleLock = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('锁定:', selectedIds);
  };

  // 复制
  const handleDuplicate = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('复制:', selectedIds);
  };

  // 删除
  const handleDelete = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('删除:', selectedIds);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            <h2 className="text-lg font-semibold">批量操作</h2>
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-sm">
              {selectedIds.length} 条
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 操作选择 */}
          {!operation ? (
            <div className="grid grid-cols-2 gap-3">
              {operations.map((op) => (
                <button
                  key={op.id}
                  onClick={() => setOperation(op)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left
                    ${op.danger 
                      ? 'border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-violet-300 dark:hover:border-violet-700'
                    }
                  `}
                >
                  <op.icon className={`w-5 h-5 ${op.color}`} />
                  <div>
                    <p className={`font-medium ${op.danger ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                      {op.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {op.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* 操作详情 */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <operation.icon className={`w-6 h-6 ${operation.color}`} />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {operation.label}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    将对 {selectedIds.length} 条记忆执行此操作
                  </p>
                </div>
                <button
                  onClick={() => {
                    setOperation(null);
                    setConfirmDelete(false);
                  }}
                  className="ml-auto text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  更换操作
                </button>
              </div>

              {/* 操作参数 */}
              {operation.id === 'add-tags' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    要添加的标签（逗号分隔）
                  </label>
                  <input
                    type="text"
                    value={targetTags}
                    onChange={(e) => setTargetTags(e.target.value)}
                    placeholder="例如: 技术, 前端, React"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                </div>
              )}

              {operation.id === 'visibility' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    可见性设置
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'public', label: '公开', icon: Eye },
                      { value: 'followers', label: '关注者', icon: EyeOff },
                      { value: 'private', label: '私密', icon: Lock }
                    ].map((v) => (
                      <button
                        key={v.value}
                        onClick={() => setTargetVisibility(v.value)}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all
                          ${targetVisibility === v.value
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-600'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                          }
                        `}
                      >
                        <v.icon className="w-4 h-4" />
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {operation.id === 'delete' && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-700 dark:text-red-400">
                        危险操作警告
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                        删除操作不可恢复，请确认是否继续
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmDelete}
                      onChange={(e) => setConfirmDelete(e.target.checked)}
                      className="w-4 h-4 rounded border-red-300 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm text-red-600 dark:text-red-400">
                      我确认要删除这 {selectedIds.length} 条记忆
                    </span>
                  </label>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setOperation(null);
                    setConfirmDelete(false);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleOperation}
                  disabled={loading || (operation.id === 'delete' && !confirmDelete)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed
                    ${operation.danger 
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700'
                    }
                  `}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <operation.icon className="w-4 h-4" />
                      确认执行
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchOperationsEnhanced;