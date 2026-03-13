import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Copy, QrCode, Share2 } from 'lucide-react';
import QRCode from 'qrcode';

const QRShareModal = ({ memoryId, memoryTitle, onClose }) => {
  const canvasRef = useRef(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  
  const shareUrl = `${window.location.origin}/memory/${memoryId}`;

  useEffect(() => {
    generateQR();
  }, [memoryId]);

  const generateQR = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(shareUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1a1a2e',
          light: '#ffffff'
        }
      });
      setQrDataUrl(dataUrl);
      
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = dataUrl;
      }
    } catch (error) {
      console.error('生成二维码失败:', error);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `memory-${memoryId}-qrcode.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: memoryTitle || '分享记忆',
          url: shareUrl
        });
      } catch (error) {
        console.error('分享失败:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-xl w-full max-w-sm overflow-hidden"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <QrCode size={24} className="text-primary" />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>分享记忆</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* QR Code */}
        <div className="p-6 text-center">
          <div 
            className="inline-block p-4 rounded-xl mb-4"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            {qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt="QR Code" 
                className="w-56 h-56 mx-auto"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          {memoryTitle && (
            <p className="text-sm mb-4 truncate" style={{ color: 'var(--text-secondary)' }}>
              {memoryTitle}
            </p>
          )}

          {/* URL */}
          <div 
            className="flex items-center gap-2 p-3 rounded-lg mb-4"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <span 
              className="flex-1 text-xs truncate"
              style={{ color: 'var(--text-secondary)' }}
            >
              {shareUrl}
            </span>
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors ${
                copied ? 'text-green-600' : 'text-primary hover:bg-primary/10'
              }`}
            >
              {copied ? '已复制' : '复制'}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border hover:opacity-90 transition-colors"
              style={{ 
                backgroundColor: 'var(--bg-secondary)', 
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            >
              <Download size={18} />
              保存图片
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90 transition-colors"
            >
              <Share2 size={18} />
              分享
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRShareModal;