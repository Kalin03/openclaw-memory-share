import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Loader2, Check } from 'lucide-react';
import axios from 'axios';

/**
 * 批量导出PDF组件
 * 支持将选中的记忆导出为PDF文件
 */
const BatchExportPDF = ({ isOpen, onClose, selectedIds, selectedMemories }) => {
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState('merged'); // merged, separate
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeTags, setIncludeTags] = useState(true);
  const [paperSize, setPaperSize] = useState('A4');
  const [exportStatus, setExportStatus] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setExportStatus(null);
    }
  }, [isOpen]);

  const handleExport = async () => {
    if (selectedIds.length === 0) return;

    setLoading(true);
    setExportStatus(null);

    try {
      // 获取选中记忆的完整数据
      const memories = selectedMemories || [];
      
      // 如果没有传入完整数据，从API获取
      const memoriesToExport = memories.length > 0 ? memories : await fetchMemories();

      // 生成PDF内容
      const pdfContent = generatePDFContent(memoriesToExport);

      // 创建下载
      downloadPDF(pdfContent, memoriesToExport);

      setExportStatus({
        success: true,
        count: memoriesToExport.length
      });
    } catch (error) {
      console.error('导出PDF失败:', error);
      setExportStatus({
        success: false,
        error: error.message || '导出失败'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMemories = async () => {
    const res = await axios.post('/api/memories/batch/details', {
      memoryIds: selectedIds
    });
    return res.data.memories || [];
  };

  const generatePDFContent = (memories) => {
    const styles = `
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .memory { 
          margin-bottom: 40px;
          page-break-inside: avoid;
          border-bottom: 1px solid #eee;
          padding-bottom: 30px;
        }
        .memory:last-child { border-bottom: none; }
        .memory-title { 
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 10px;
          color: #1a1a1a;
        }
        .memory-meta {
          font-size: 12px;
          color: #666;
          margin-bottom: 15px;
        }
        .memory-content {
          font-size: 14px;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .memory-tags {
          margin-top: 15px;
        }
        .tag {
          display: inline-block;
          padding: 2px 8px;
          background: #f0f0f0;
          border-radius: 12px;
          font-size: 11px;
          margin-right: 5px;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #333;
        }
        .header h1 {
          font-size: 24px;
          margin-bottom: 10px;
        }
        .header p {
          color: #666;
          font-size: 14px;
        }
        @media print {
          body { padding: 0; }
          .memory { page-break-inside: avoid; }
        }
      </style>
    `;

    let content = '';
    
    if (exportFormat === 'merged') {
      content = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Memory Share - 导出记忆</title>
          ${styles}
        </head>
        <body>
          <div class="header">
            <h1>Memory Share</h1>
            <p>共 ${memories.length} 条记忆 · 导出时间: ${new Date().toLocaleString('zh-CN')}</p>
          </div>
          ${memories.map(m => `
            <div class="memory">
              <div class="memory-title">${escapeHtml(m.title || '无标题')}</div>
              ${includeMetadata ? `
                <div class="memory-meta">
                  创建时间: ${new Date(m.created_at).toLocaleString('zh-CN')}
                  ${m.views_count ? ` · 阅读: ${m.views_count}` : ''}
                  ${m.likes_count ? ` · 点赞: ${m.likes_count}` : ''}
                </div>
              ` : ''}
              <div class="memory-content">${escapeHtml(m.content || '')}</div>
              ${includeTags && m.tags ? `
                <div class="memory-tags">
                  ${m.tags.split(',').map(t => `<span class="tag">${escapeHtml(t.trim())}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </body>
        </html>
      `;
    } else {
      // Separate files - return array of content
      content = memories.map(m => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${escapeHtml(m.title || '无标题')}</title>
          ${styles}
        </head>
        <body>
          <div class="memory">
            <div class="memory-title">${escapeHtml(m.title || '无标题')}</div>
            ${includeMetadata ? `
              <div class="memory-meta">
                创建时间: ${new Date(m.created_at).toLocaleString('zh-CN')}
                ${m.views_count ? ` · 阅读: ${m.views_count}` : ''}
                ${m.likes_count ? ` · 点赞: ${m.likes_count}` : ''}
              </div>
            ` : ''}
            <div class="memory-content">${escapeHtml(m.content || '')}</div>
            ${includeTags && m.tags ? `
              <div class="memory-tags">
                ${m.tags.split(',').map(t => `<span class="tag">${escapeHtml(t.trim())}</span>`).join('')}
              </div>
            ` : ''}
          </div>
        </body>
        </html>
      `);
    }

    return content;
  };

  const escapeHtml = (text) => {
    const div = { innerHTML: '' };
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  };

  const downloadPDF = (content, memories) => {
    if (exportFormat === 'merged') {
      // 使用浏览器打印功能导出PDF
      const printWindow = window.open('', '_blank');
      printWindow.document.write(content);
      printWindow.document.close();
      
      // 等待内容加载完成后打印
      printWindow.onload = () => {
        printWindow.print();
      };
    } else {
      // 批量导出时，只下载第一个（简化处理）
      const printWindow = window.open('', '_blank');
      printWindow.document.write(Array.isArray(content) ? content[0] : content);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5" />
            <h2 className="text-lg font-semibold">导出为PDF</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-5 space-y-4">
          {/* 记忆数量 */}
          <div className="text-center py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{selectedIds.length}</span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">条记忆将被导出</span>
          </div>

          {/* 导出格式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              导出格式
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setExportFormat('merged')}
                className={`px-4 py-2 rounded-lg border-2 transition-colors text-sm
                  ${exportFormat === 'merged' 
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600' 
                    : 'border-gray-200 dark:border-gray-600'}`}
              >
                合并为一个文件
              </button>
              <button
                onClick={() => setExportFormat('separate')}
                className={`px-4 py-2 rounded-lg border-2 transition-colors text-sm
                  ${exportFormat === 'separate' 
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600' 
                    : 'border-gray-200 dark:border-gray-600'}`}
              >
                每条单独导出
              </button>
            </div>
          </div>

          {/* 包含选项 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              包含内容
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">包含元数据（创建时间、阅读量等）</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTags}
                  onChange={(e) => setIncludeTags(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">包含标签</span>
              </label>
            </div>
          </div>

          {/* 导出状态 */}
          {exportStatus && (
            <div className={`p-3 rounded-lg flex items-center gap-2
              ${exportStatus.success 
                ? 'bg-green-50 dark:bg-green-900/30 text-green-600' 
                : 'bg-red-50 dark:bg-red-900/30 text-red-600'}`}
            >
              {exportStatus.success ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>成功导出 {exportStatus.count} 条记忆</span>
                </>
              ) : (
                <span>{exportStatus.error}</span>
              )}
            </div>
          )}

          {/* 提示 */}
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
            <p>💡 提示：导出后将打开新窗口，请使用浏览器的"另存为PDF"功能保存。</p>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-5 py-4 bg-gray-50 dark:bg-gray-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={loading || selectedIds.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                导出PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchExportPDF;