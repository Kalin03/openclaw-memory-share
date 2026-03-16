import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileText, 
  FileJson, 
  Archive,
  Loader2,
  CheckSquare,
  Square,
  Filter
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

/**
 * 批量导出组件
 * 支持批量导出选中的记忆
 */
const BatchExport = ({ isOpen, onClose, selectedIds = [], memories = [] }) => {
  const toast = useToast();
  const [exportFormat, setExportFormat] = useState('markdown');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportRange, setExportRange] = useState('selected'); // selected, all, filtered

  // 导出格式配置
  const formats = [
    { id: 'markdown', label: 'Markdown', icon: FileText, ext: '.md' },
    { id: 'json', label: 'JSON', icon: FileJson, ext: '.json' },
    { id: 'html', label: 'HTML', icon: Archive, ext: '.html' }
  ];

  // 获取要导出的记忆
  const getMemoriesToExport = () => {
    if (exportRange === 'selected' && selectedIds.length > 0) {
      return memories.filter(m => selectedIds.includes(m.id));
    }
    return memories;
  };

  // 生成 Markdown
  const generateMarkdown = (memories) => {
    let md = `# 记忆导出\n\n`;
    md += `> 导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
    md += `> 总数: ${memories.length} 条\n\n---\n\n`;

    memories.forEach((memory, index) => {
      md += `## ${index + 1}. ${memory.title || '无标题'}\n\n`;
      
      if (includeMetadata) {
        md += `**作者**: ${memory.username || '匿名'}  \n`;
        md += `**时间**: ${new Date(memory.created_at).toLocaleString('zh-CN')}  \n`;
        if (memory.tags) {
          const tags = memory.tags.split(',').filter(Boolean);
          if (tags.length > 0) {
            md += `**标签**: ${tags.map(t => `\`${t}\``).join(' ')}  \n`;
          }
        }
        md += '\n';
      }
      
      md += `${memory.content || '暂无内容'}\n\n---\n\n`;
    });

    return md;
  };

  // 生成 JSON
  const generateJSON = (memories) => {
    const data = {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        totalCount: memories.length
      },
      memories: memories.map(m => ({
        id: m.id,
        title: m.title,
        content: m.content,
        tags: m.tags ? m.tags.split(',').filter(Boolean) : [],
        author: m.username,
        createdAt: m.created_at,
        ...(includeMetadata && {
          likes: m.likes_count || 0,
          comments: m.comments_count || 0,
          bookmarks: m.bookmarks_count || 0
        })
      }))
    };
    return JSON.stringify(data, null, 2);
  };

  // 生成 HTML
  const generateHTML = (memories) => {
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>记忆导出</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .memory { background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .memory h2 { margin: 0 0 12px; color: #1a1a1a; }
    .meta { font-size: 14px; color: #666; margin-bottom: 12px; }
    .tags { display: flex; gap: 8px; flex-wrap: wrap; }
    .tag { background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
    .content { line-height: 1.6; color: #333; }
  </style>
</head>
<body>
  <h1>记忆导出</h1>
  <p>导出时间: ${new Date().toLocaleString('zh-CN')} | 总数: ${memories.length} 条</p>
`;

    memories.forEach((memory, index) => {
      html += `
  <article class="memory">
    <h2>${index + 1}. ${memory.title || '无标题'}</h2>
    ${includeMetadata ? `
    <div class="meta">
      <span>${memory.username || '匿名'}</span>
      <span> · </span>
      <span>${new Date(memory.created_at).toLocaleString('zh-CN')}</span>
    </div>
    ` : ''}
    <div class="content">${memory.content || '暂无内容'}</div>
    ${memory.tags ? `
    <div class="tags">
      ${memory.tags.split(',').filter(Boolean).map(t => `<span class="tag">#${t}</span>`).join('')}
    </div>
    ` : ''}
  </article>
`;
    });

    html += `
</body>
</html>`;

    return html;
  };

  // 执行导出
  const handleExport = async () => {
    const memoriesToExport = getMemoriesToExport();
    
    if (memoriesToExport.length === 0) {
      toast.warning('没有可导出的记忆');
      return;
    }

    setIsExporting(true);

    try {
      let content, filename, mimeType;

      switch (exportFormat) {
        case 'markdown':
          content = generateMarkdown(memoriesToExport);
          filename = `memories-export-${Date.now()}.md`;
          mimeType = 'text/markdown';
          break;
        case 'json':
          content = generateJSON(memoriesToExport);
          filename = `memories-export-${Date.now()}.json`;
          mimeType = 'application/json';
          break;
        case 'html':
          content = generateHTML(memoriesToExport);
          filename = `memories-export-${Date.now()}.html`;
          mimeType = 'text/html';
          break;
      }

      // 下载文件
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`已导出 ${memoriesToExport.length} 条记忆`);
      onClose();
    } catch (err) {
      console.error('导出失败:', err);
      toast.error('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const exportCount = exportRange === 'selected' ? selectedIds.length : memories.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            <h2 className="text-lg font-semibold">批量导出</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* 导出范围 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              导出范围
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                <input
                  type="radio"
                  name="exportRange"
                  value="selected"
                  checked={exportRange === 'selected'}
                  onChange={(e) => setExportRange(e.target.value)}
                  className="w-4 h-4 text-teal-500"
                />
                {exportRange === 'selected' ? (
                  <CheckSquare className="w-5 h-5 text-teal-500" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  已选中的记忆 ({selectedIds.length} 条)
                </span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                <input
                  type="radio"
                  name="exportRange"
                  value="all"
                  checked={exportRange === 'all'}
                  onChange={(e) => setExportRange(e.target.value)}
                  className="w-4 h-4 text-teal-500"
                />
                <Filter className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  当前列表全部 ({memories.length} 条)
                </span>
              </label>
            </div>
          </div>

          {/* 格式选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              导出格式
            </label>
            <div className="grid grid-cols-3 gap-3">
              {formats.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setExportFormat(format.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all
                    ${exportFormat === format.id
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }
                  `}
                >
                  <format.icon className={`w-6 h-6 ${exportFormat === format.id ? 'text-teal-500' : 'text-gray-400'}`} />
                  <span className={`text-sm ${exportFormat === format.id ? 'text-teal-600 dark:text-teal-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                    {format.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 选项 */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                包含元数据（作者、时间、标签等）
              </span>
            </label>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || exportCount === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  导出 {exportCount} 条
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchExport;