import React, { useState, useEffect } from 'react';
import { 
  Bookmark, 
  X, 
  Copy, 
  Check, 
  ExternalLink,
  Info,
  MousePointer
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const BookmarkletSetup = ({ onClose }) => {
  const toast = useToast();
  const [bookmarkletCode, setBookmarkletCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchBookmarkletCode();
  }, []);

  const fetchBookmarkletCode = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/bookmarklet/code', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookmarkletCode(res.data.bookmarkletUrl);
    } catch (error) {
      console.error('获取Bookmarklet失败:', error);
      toast.error('获取书签工具失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletCode);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('复制失败');
    }
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', bookmarkletCode);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Bookmark className="text-primary" size={24} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>书签收集工具</h2>
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
              {/* 说明 */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <h3 className="font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Info size={18} className="text-blue-500" />
                  什么是书签收集工具？
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  这是一个浏览器书签小工具。在任意网页点击书签，即可快速保存网页内容到你的收集箱，支持保存选中的文字和网页来源链接。
                </p>
              </div>

              {/* 拖拽按钮 */}
              <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  👇 将下方按钮拖拽到浏览器书签栏
                </p>
                
                <a
                  href={bookmarkletCode}
                  draggable
                  onDragStart={handleDragStart}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-medium cursor-move hover:bg-primary/90 transition-colors"
                >
                  <Bookmark size={20} />
                  保存到 Memory Share
                </a>

                <p className="text-xs mt-4" style={{ color: 'var(--text-secondary)' }}>
                  💡 提示：如果书签栏未显示，按 Ctrl+Shift+B (Windows) 或 Cmd+Shift+B (Mac) 显示
                </p>
              </div>

              {/* 手动安装 */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <h3 className="font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <MousePointer size={18} />
                  手动安装步骤
                </h3>
                <ol className="text-sm space-y-2 list-decimal list-inside" style={{ color: 'var(--text-secondary)' }}>
                  <li>右键点击浏览器书签栏，选择"添加书签"或"添加页面"</li>
                  <li>名称填写：<code className="px-1 rounded bg-gray-100 dark:bg-gray-800">保存到 Memory Share</code></li>
                  <li>网址/URL 填写下方复制的代码</li>
                  <li>保存后即可使用</li>
                </ol>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex-1 py-2 px-4 rounded-lg border font-medium transition-colors flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    {copied ? (
                      <>
                        <Check size={16} className="text-green-500" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        复制代码
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 使用方法 */}
              <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                <p className="font-medium mb-1">📖 使用方法：</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>在任意网页选中要保存的文字</li>
                  <li>点击书签栏的"保存到 Memory Share"</li>
                  <li>可添加标签，内容将保存到收集箱</li>
                  <li>如果没有选中文字，将保存网页标题</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookmarkletSetup;