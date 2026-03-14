import React, { useRef, useState } from 'react';
import { Download, Share2, X, Loader2 } from 'lucide-react';

const SharePoster = ({ memory, onClose }) => {
  const canvasRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generatePoster = async () => {
    setGenerating(true);
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Canvas size
      const width = 750;
      const height = 1000;
      canvas.width = width;
      canvas.height = height;
      
      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#ff7e5f');
      gradient.addColorStop(1, '#feb47b');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      // White content area
      ctx.fillStyle = '#ffffff';
      ctx.roundRect(40, 150, width - 80, height - 250, 20);
      ctx.fill();
      
      // Logo area
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🦞 Memory Share', width / 2, 80);
      ctx.font = '24px Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText('记录、分享、发现', width / 2, 120);
      
      // Avatar
      ctx.fillStyle = '#f0f0f0';
      ctx.beginPath();
      ctx.arc(120, 220, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '40px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(memory.avatar || '🦞', 120, 230);
      
      // Username
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(memory.username || '用户', 180, 215);
      
      // Date
      ctx.fillStyle = '#999999';
      ctx.font = '20px Arial';
      const date = new Date(memory.created_at).toLocaleDateString('zh-CN');
      ctx.fillText(date, 180, 245);
      
      // Title
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'left';
      const title = memory.title?.substring(0, 20) || '记忆分享';
      ctx.fillText(title, 60, 320);
      
      // Content
      ctx.fillStyle = '#666666';
      ctx.font = '24px Arial';
      const content = memory.content?.replace(/[#*`]/g, '').replace(/\n/g, ' ').substring(0, 150) || '';
      const lines = wrapText(ctx, content, width - 120, 400);
      lines.forEach((line, i) => {
        ctx.fillText(line, 60, 400 + i * 36);
      });
      
      // Tags
      if (memory.tags) {
        ctx.fillStyle = '#e8572b';
        ctx.font = '20px Arial';
        const tags = memory.tags.split(',').slice(0, 3);
        tags.forEach((tag, i) => {
          const tagText = `#${tag.trim()}`;
          ctx.fillText(tagText, 60 + i * 120, 580);
        });
      }
      
      // Stats
      ctx.fillStyle = '#999999';
      ctx.font = '22px Arial';
      ctx.fillText(`❤️ ${memory.likes_count || 0}   ⭐ ${memory.bookmarks_count || 0}   👁️ ${memory.views_count || 0}`, 60, 650);
      
      // QR code placeholder
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(width / 2 - 75, 720, 150, 150);
      ctx.strokeStyle = '#e8572b';
      ctx.lineWidth = 2;
      ctx.strokeRect(width / 2 - 75, 720, 150, 150);
      ctx.fillStyle = '#999999';
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('扫码查看详情', width / 2, 900);
      
      // Watermark
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.font = '16px Arial';
      ctx.fillText('memory-share.kalin.asia', width / 2, height - 20);
      
      setGenerated(true);
    } catch (err) {
      console.error('生成海报失败:', err);
    } finally {
      setGenerating(false);
    }
  };

  const wrapText = (ctx, text, maxWidth, startY) => {
    const lines = [];
    let currentLine = '';
    
    for (const char of text) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
        if (lines.length >= 4) break; // Max 4 lines
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine && lines.length < 4) {
      lines.push(currentLine);
    }
    
    return lines;
  };

  const downloadPoster = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `memory-${memory.id?.substring(0, 8) || 'share'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const sharePoster = async () => {
    const canvas = canvasRef.current;
    canvas.toBlob(async (blob) => {
      if (navigator.share && blob) {
        try {
          const file = new File([blob], 'memory-share.png', { type: 'image/png' });
          await navigator.share({
            title: memory.title || '记忆分享',
            files: [file]
          });
        } catch (err) {
          console.error('分享失败:', err);
        }
      } else {
        downloadPoster();
      }
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div 
        className="relative max-w-lg w-full max-h-[90vh] overflow-auto rounded-xl"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            分享海报
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <canvas ref={canvasRef} className="w-full rounded-lg shadow-lg" style={{ display: generated ? 'block' : 'none' }} />
          
          {!generated && (
            <div 
              className="aspect-[3/4] flex items-center justify-center rounded-lg"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <button
                onClick={generatePoster}
                disabled={generating}
                className="flex flex-col items-center gap-2 px-6 py-4 rounded-lg bg-primary text-white"
              >
                {generating ? (
                  <>
                    <Loader2 size={24} className="animate-spin" />
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <Share2 size={24} />
                    <span>生成分享海报</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {generated && (
          <div className="flex gap-3 p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={downloadPoster}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-white"
            >
              <Download size={18} />
              <span>保存图片</span>
            </button>
            <button
              onClick={sharePoster}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              <Share2 size={18} />
              <span>分享</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharePoster;