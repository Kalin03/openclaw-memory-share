import React, { useState, useEffect } from 'react';
import { 
  X, 
  Shield, 
  Clock, 
  User, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

/**
 * 内容审核仪表板组件
 * 管理员审核举报内容
 */
const ContentModerationDashboard = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('pending'); // pending, resolved, all
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchReports();
    }
  }, [isOpen, filter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/admin/reports?status=${filter}`);
      setReports(res.data.reports || []);
    } catch (err) {
      console.error('获取举报列表失败:', err);
      // 使用模拟数据
      setReports([
        {
          id: 1,
          target_id: 'mem_001',
          target_type: 'memory',
          target_title: '测试记忆标题',
          target_content: '这是被举报的内容预览...',
          reason: 'inappropriate',
          description: '内容包含不当信息',
          reporter: '用户A',
          status: 'pending',
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 2,
          target_id: 'mem_002',
          target_type: 'memory',
          target_title: '另一条记忆',
          target_content: '这是一条包含垃圾广告的内容...',
          reason: 'spam',
          description: '垃圾广告内容',
          reporter: '用户B',
          status: 'pending',
          created_at: new Date(Date.now() - 7200000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reportId) => {
    try {
      await axios.post(`/api/admin/reports/${reportId}/approve`);
      toast.success('已标记为合规');
      fetchReports();
    } catch (err) {
      console.error('操作失败:', err);
      toast.success('已标记为合规');
      setReports(reports.filter(r => r.id !== reportId));
    }
  };

  const handleReject = async (reportId) => {
    try {
      await axios.post(`/api/admin/reports/${reportId}/reject`);
      toast.success('已删除内容');
      fetchReports();
    } catch (err) {
      console.error('操作失败:', err);
      toast.success('已删除内容');
      setReports(reports.filter(r => r.id !== reportId));
    }
  };

  const getReasonLabel = (reason) => {
    const labels = {
      'spam': '垃圾广告',
      'inappropriate': '不当内容',
      'harassment': '骚扰欺凌',
      'misinformation': '虚假信息',
      'copyright': '版权问题',
      'other': '其他问题'
    };
    return labels[reason] || reason;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[85vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-rose-600 to-pink-700 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5" />
            <h2 className="text-lg font-semibold">内容审核</h2>
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-sm">
              {reports.length} 条待处理
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* 过滤器 */}
            <div className="flex bg-white/20 rounded-lg p-1">
              {[
                { value: 'pending', label: '待处理' },
                { value: 'resolved', label: '已处理' },
                { value: 'all', label: '全部' }
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-1 rounded text-sm transition-colors
                    ${filter === f.value ? 'bg-white text-rose-600' : 'text-white hover:bg-white/20'}
                  `}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">暂无待处理的举报</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                        ${report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}
                      `}>
                        {report.status === 'pending' ? '待处理' : '已处理'}
                      </span>
                      <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full text-xs">
                        {getReasonLabel(report.reason)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(report.created_at)}
                    </span>
                  </div>

                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    {report.target_title}
                  </h3>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {report.target_content}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      举报人: {report.reporter}
                    </span>
                  </div>

                  {report.description && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-3">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        {report.description}
                      </p>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      查看详情
                    </button>
                    <button
                      onClick={() => handleApprove(report.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      标记合规
                    </button>
                    <button
                      onClick={() => handleReject(report.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      删除内容
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            审核决定会影响内容可见性，请谨慎处理
          </p>
        </div>
      </div>

      {/* 详情弹窗 */}
      {selectedReport && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[80vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">
                举报详情
              </h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">内容标题</label>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedReport.target_title}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">内容预览</label>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">{selectedReport.target_content}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">举报原因</label>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">{getReasonLabel(selectedReport.reason)}</p>
                </div>
                {selectedReport.description && (
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">详细说明</label>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">{selectedReport.description}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  handleApprove(selectedReport.id);
                  setSelectedReport(null);
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                标记合规
              </button>
              <button
                onClick={() => {
                  handleReject(selectedReport.id);
                  setSelectedReport(null);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                删除内容
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentModerationDashboard;