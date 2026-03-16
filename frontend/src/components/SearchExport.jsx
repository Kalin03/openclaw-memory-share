import React, { useState, useEffect } from 'react';
import { 
  Download, 
  FileText, 
  FileJson, 
  FileSpreadsheet, 
  X, 
  Check, 
  Loader2,
  Filter,
  Calendar,
  Tag,
  Hash
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

/**
 * 搜索结果导出组件
 * 支持将搜索结果导出为 Markdown、JSON、CSV 格式
 */
const SearchExport = ({ 
  isOpen, 
  onClose, 
  searchQuery, 
  filters = {},
  resultCount = 0 
}) => {
  const toast = useToast();
  const [exportFormat, setExportFormat] = useState('markdown');
  const [exportRange, setExportRange] = useState('all'); // all, selected, current
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeContent, setIncludeContent] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // 导出格式配置
  const formats = [
    { 
      id: 'markdown', 
      label: 'Markdown', 
      icon: FileText, 
      ext: '.md',
      description: '适合阅读和博客发布'
    },
    { 
      id: 'json', 
      label: 'JSON', 
      icon: FileJson, 
      ext: '.json',
      description: '适合数据备份和迁移'
    },
    { 
      id: 'csv', 
      label: 'CSV', 
      icon: FileSpreadsheet, 
      ext: '.csv',
      description: '适合表格分析和统计'
    }
  ];

  // 获取预览数据
  useEffect(() => {
    if (isOpen && resultCount > 0) {
      fetchPreviewData();
    }
  }, [isOpen, searchQuery, filters]);

  const fetchPreviewData = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (filters.tags) params.append('tags', filters.tags);
      if (filters.author) params.append('author', filters.author);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('limit', '10'); // 预览只取10条

      const res = await axios.get(`/api/memories?${params.toString()}`);
      setPreviewData(res.data.memories || []);
    } catch (err) {
      console.error('获取预览数据失败:', err);
    }
  };

  // 执行导出
  const handleExport = async () => {
    setIsExporting(true);
    try {
      // 获取全部数据
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (filters.tags) params.append('tags', filters.tags);
      if (filters.author) params.append('author', filters.author);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('limit', '1000');

      const res = await axios.get(`/api/memories?${params.toString()}`);
      const memories = res.data.memories || [];

      if (memories.length === 0) {
        toast.warning('没有可导出的数据');
        return;
      }

      let content, filename, mimeType;

      switch (exportFormat) {
        case 'markdown':
          content = generateMarkdown(memories);
          filename = `memories-export-${Date.now()}.md`;
          mimeType = 'text/markdown';
          break;
        case 'json':
          content = generateJSON(memories);
          filename = `memories-export-${Date.now()}.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          content = generateCSV(memories);
          filename = `memories-export-${Date.now()}.csv`;
          mimeType = 'text/csv';
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

      toast.success(`已导出 ${memories.length} 条记忆`);
      onClose();
    } catch (err) {
      console.error('导出失败:', err);
      toast.error('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  // 生成 Markdown
  const generateMarkdown = (memories) => {
    let md = `# 记忆导出\n\n`;
    md += `> 导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
    md += `> 搜索关键词: ${searchQuery || '全部'}\n`;
    md += `> 总数: ${memories.length} 条\n\n`;
    md += `---\n\n`;

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
        md += `**可见性**: ${memory.visibility === 'public' ? '公开' : memory.visibility === 'followers' ? '仅关注者' : '私密'}  \n`;
        md += `**统计**: 👍 ${memory.likes_count || 0} | 💬 ${memory.comments_count || 0} | 🔖 ${memory.bookmarks_count || 0}  \n\n`;
      }
      
      if (includeContent) {
        md += `${memory.content || '暂无内容'}\n\n`;
      }
      
      md += `---\n\n`;
    });

    return md;
  };

  // 生成 JSON
  const generateJSON = (memories) => {
    const data = {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        searchQuery: searchQuery || null,
        filters: filters,
        totalCount: memories.length
      },
      memories: memories.map(m => ({
        id: m.id,
        title: m.title,
        content: includeContent ? m.content : undefined,
        tags: m.tags ? m.tags.split(',').filter(Boolean) : [],
        author: {
          id: m.user_id,
          name: m.username
        },
        visibility: m.visibility,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
        stats: includeMetadata ? {
          likes: m.likes_count || 0,
          comments: m.comments_count || 0,
          bookmarks: m.bookmarks_count || 0,
          views: m.views || 0
        } : undefined
      }))
    };
    return JSON.stringify(data, null, 2);
  };

  // 生成 CSV
  const generateCSV = (memories) => {
    const headers = ['ID', '标题', '作者', '创建时间', '标签', '可见性'];
    if (includeContent) headers.push('内容');
    if (includeMetadata) headers.push('点赞数', '评论数', '收藏数', '阅读数');

    let csv = headers.join(',') + '\n';

    memories.forEach(m => {
      const row = [
        m.id,
        `"${(m.title || '').replace(/"/g, '""')}"`,
        `"${(m.username || '').replace(/"/g, '""')}"`,
        m.created_at,
        `"${(m.tags || '').replace(/"/g, '""')}"`,
        m.visibility
      ];
      
      if (includeContent) {
        row.push(`"${(m.content || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`);
      }
      
      if (includeMetadata) {
        row.push(m.likes_count || 0);
        row.push(m.comments_count || 0);
        row.push(m.bookmarks_count || 0);
        row.push(m.views || 0);
      }

      csv += row.join(',') + '\n';
    });

    return csv;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5" />
            <h2 className="text-lg font-semibold">导出搜索结果</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 导出信息 */}
          <div className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Filter className="w-5 h-5 text-gray-500" />
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {searchQuery ? (
                  <>搜索关键词: <span className="font-medium">{searchQuery}</span></>
                ) : (
                  '全部记忆'
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                共 {resultCount} 条结果可导出
              </p>
            </div>
          </div>

          {/* 格式选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              导出格式
            </label>
            <div className="grid grid-cols-3 gap-3">
              {formats.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setExportFormat(format.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                    ${exportFormat === format.id
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }
                  `}
                >
                  <format.icon className={`w-6 h-6 ${exportFormat === format.id ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${exportFormat === format.id ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {format.label}
                  </span>
                  <span className="text-xs text-gray-400">{format.ext}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {formats.find(f => f.id === exportFormat)?.description}
            </p>
          </div>

          {/* 导出选项 */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              导出内容
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeContent}
                onChange={(e) => setIncludeContent(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">包含记忆内容</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">包含元数据（作者、时间、标签、统计）</span>
            </label>
          </div>

          {/* 预览 */}
          {previewData && previewData.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-xs text-gray-500">
                预览前 {Math.min(previewData.length, 5)} 条
              </div>
              <div className="max-h-32 overflow-y-auto p-3 space-y-2">
                {previewData.slice(0, 5).map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Hash className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300 truncate">
                      {m.title || '无标题'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || resultCount === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  导出 {resultCount} 条
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchExport;