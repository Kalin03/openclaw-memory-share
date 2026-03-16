import React, { useState, useRef, useEffect } from 'react';
import { Link2, Copy, Check, X, QrCode, Share2, Twitter, MessageCircle } from 'lucide-react';
import QRCode from 'qrcode';

/**
 * 快捷分享弹窗组件
 * 提供一键复制链接、二维码分享、社交媒体分享
 */
const QuickShareModal = ({ isOpen, onClose, memoryId, memoryTitle }) => {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showQR, setShowQR] = useState(false);
  
  const shareUrl = `${window.location.origin}/memory/${memoryId}`;
  const shareText = `查看这篇记忆：${memoryTitle || '精彩内容'}`;

  // 复制链接
  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 生成二维码
  const generateQRCode = async () => {
    try {
      const qr = await QRCode.toDataURL(shareUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#1e40af',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qr);
      setShowQR(true);
    } catch (err) {
      console.error('生成二维码失败:', err);
    }
  };

  // 社交媒体分享
  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareToWeChat = () => {
    setShowQR(true);
    if (!qrCodeUrl) {
      generateQRCode();
    }
  };

  const shareToWeibo = () => {
    const url = `https://service.weibo.com/share/share.php?title=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  // Web Share API
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: memoryTitle || '分享记忆',
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('分享失败:', err);
        }
      }
    }
  };

  useEffect(() => {
    if (isOpen && !qrCodeUrl) {
      generateQRCode();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            <h2 className="text-lg font-semibold">分享</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 链接复制 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              复制链接
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 truncate"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all
                  ${copied 
                    ? 'bg-green-500 text-white' 
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                  }
                `}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    复制
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 快捷分享按钮 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              快捷分享
            </label>
            <div className="flex gap-3">
              <button
                onClick={shareToWeChat}
                className="flex-1 flex flex-col items-center gap-1.5 p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-xs">微信</span>
              </button>
              <button
                onClick={shareToWeibo}
                className="flex-1 flex flex-col items-center gap-1.5 p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
              >
                <Share2 className="w-5 h-5" />
                <span className="text-xs">微博</span>
              </button>
              <button
                onClick={shareToTwitter}
                className="flex-1 flex flex-col items-center gap-1.5 p-3 bg-blue-400 text-white rounded-xl hover:bg-blue-500 transition-colors"
              >
                <Twitter className="w-5 h-5" />
                <span className="text-xs">Twitter</span>
              </button>
            </div>
          </div>

          {/* 二维码 */}
          {showQR && qrCodeUrl && (
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <img 
                src={qrCodeUrl} 
                alt="分享二维码" 
                className="mx-auto rounded-lg shadow-sm"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                扫描二维码查看
              </p>
            </div>
          )}

          {/* 原生分享按钮 */}
          {navigator.share && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              使用系统分享
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickShareModal;