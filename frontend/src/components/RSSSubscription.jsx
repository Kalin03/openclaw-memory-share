import React, { useState, useEffect } from 'react';
import { Rss, Copy, RefreshCw, Check, X, ExternalLink } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const RSSSubscription = ({ onClose }) => {
  const toast = useToast();
  const [rssToken, setRssToken] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    fetchRSSToken();
  }, []);

  const fetchRSSToken = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/user/rss-token', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRssToken(res.data.rssToken);
      setFeedUrl(res.data.feedUrl);
    } catch (error) {
      console.error('获取RSS token失败:', error);
      toast.error('获取RSS订阅信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = feedUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm('重新生成RSS地址后，旧的订阅将失效。确定要继续吗？')) {
      return;
    }

    setRegenerating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/user/rss-token/regenerate', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRssToken(res.data.rssToken);
      setFeedUrl(res.data.feedUrl);
      toast.success('RSS地址已更新');
    } catch (error) {
      console.error('重新生成RSS token失败:', error);
      toast.error('操作失败');
    } finally {
      setRegenerating(false);
    }
  };

  const publicFeedUrl = `${window.location.origin}/api/rss/public`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Rss className="text-orange-500" size={24} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>RSS 订阅</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              加载中...
            </div>
          ) : (
            <>
              {/* 用户私有订阅 */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    🔐 我的记忆订阅
                  </span>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                  订阅你的公开记忆，支持在 RSS 阅读器中阅读
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={feedUrl}
                    readOnly
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  />
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    title="复制链接"
                  >
                    {copied ? (
                      <Check size={18} className="text-green-500" />
                    ) : (
                      <Copy size={18} style={{ color: 'var(--text-secondary)' }} />
                    )}
                  </button>
                </div>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="mt-3 text-xs flex items-center gap-1 text-orange-500 hover:text-orange-600 transition-colors"
                >
                  <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
                  {regenerating ? '更新中...' : '重新生成地址'}
                </button>
              </div>

              {/* 公开订阅 */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    🌐 全站公开记忆
                  </span>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                  订阅平台所有公开记忆
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={publicFeedUrl}
                    readOnly
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  />
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(publicFeedUrl);
                      toast.success('已复制到剪贴板');
                    }}
                    className="p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    title="复制链接"
                  >
                    <Copy size={18} style={{ color: 'var(--text-secondary)' }} />
                  </button>
                </div>
              </div>

              {/* 使用说明 */}
              <div className="text-xs p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                <p className="font-medium mb-2">📖 如何使用 RSS？</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>复制上面的链接</li>
                  <li>打开你的 RSS 阅读器（如 Feedly、Inoreader）</li>
                  <li>添加订阅，粘贴链接即可</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RSSSubscription;