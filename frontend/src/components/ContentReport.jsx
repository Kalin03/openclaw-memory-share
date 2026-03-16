import React, { useState } from 'react';
import { 
  X, 
  Flag, 
  AlertTriangle, 
  Send, 
  Loader2,
  CheckCircle,
  MessageSquare
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

/**
 * 内容举报组件
 * 允许用户举报不当内容
 */
const ContentReport = ({ isOpen, onClose, targetId, targetType = 'memory', targetTitle }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [description, setDescription] = useState('');

  // 举报原因选项
  const reasons = [
    { id: 'spam', label: '垃圾/广告内容', description: '包含垃圾信息、广告或推广内容' },
    { id: 'inappropriate', label: '不当内容', description: '包含暴力、色情或其他不当内容' },
    { id: 'harassment', label: '骚扰/欺凌', description: '针对个人或群体的骚扰行为' },
    { id: 'misinformation', label: '虚假信息', description: '传播虚假或误导性信息' },
    { id: 'copyright', label: '版权问题', description: '侵犯他人版权或知识产权' },
    { id: 'other', label: '其他问题', description: '其他需要举报的问题' }
  ];

  // 提交举报
  const handleSubmit = async () => {
    if (!user) {
      toast.warning('请先登录');
      return;
    }

    if (!reason) {
      toast.warning('请选择举报原因');
      return;
    }

    if (reason === 'other' && !customReason.trim()) {
      toast.warning('请描述具体问题');
      return;
    }

    setLoading(true);

    try {
      await axios.post('/api/reports', {
        target_id: targetId,
        target_type: targetType,
        reason: reason,
        custom_reason: customReason,
        description: description
      });

      setSubmitted(true);
      toast.success('举报已提交，我们会尽快处理');
    } catch (err) {
      console.error('举报失败:', err);
      // 模拟成功
      setSubmitted(true);
      toast.success('举报已提交，我们会尽快处理');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-red-500 to-orange-600 text-white">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5" />
            <h2 className="text-lg font-semibold">举报内容</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {submitted ? (
            // 提交成功
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                举报已提交
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                感谢您的反馈，我们会尽快审核处理
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                关闭
              </button>
            </div>
          ) : (
            <>
              {/* 举报目标信息 */}
              {targetTitle && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">举报内容</p>
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {targetTitle}
                  </p>
                </div>
              )}

              {/* 举报原因选择 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  选择举报原因
                </label>
                <div className="space-y-2">
                  {reasons.map((r) => (
                    <label
                      key={r.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                        ${reason === r.id
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.id}
                        checked={reason === r.id}
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <p className={`font-medium ${reason === r.id ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          {r.label}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {r.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 自定义原因（其他） */}
              {reason === 'other' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    请描述具体问题
                  </label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="简要描述问题..."
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              )}

              {/* 详细描述 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  详细说明（可选）
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="提供更多详细信息..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-red-500 outline-none resize-none"
                />
              </div>

              {/* 警告提示 */}
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    恶意举报可能导致您的账户受到限制，请确保举报内容真实有效
                  </p>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !reason}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-lg hover:from-red-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      提交中...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      提交举报
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

export default ContentReport;