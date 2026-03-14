import React, { useState } from 'react';
import { 
  Download, 
  Upload, 
  FileJson, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Info
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const DataBackupRestore = ({ onClose }) => {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importOptions, setImportOptions] = useState({
    importMemories: true,
    importCollections: true,
    importSeries: true
  });

  const handleExport = async (format = 'json') => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/user/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: format === 'json' ? 'json' : 'blob'
      });

      // 创建下载链接
      const blob = format === 'json' 
        ? new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
        : new Blob([response.data], { type: 'text/markdown' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memory-share-export-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'md'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`已导出 ${format === 'json' ? 'JSON' : 'Markdown'} 格式数据`);
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportFile(file);

    // 预览文件内容
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.version) {
        toast.error('无效的导入文件格式');
        setImportFile(null);
        return;
      }

      setImportPreview({
        version: data.version,
        exportedAt: data.exportedAt,
        stats: data.stats || {
          totalMemories: data.memories?.length || 0,
          totalBookmarks: data.bookmarks?.length || 0,
          totalCollections: data.collections?.length || 0,
          totalSeries: data.series?.length || 0
        }
      });
    } catch (error) {
      console.error('解析文件失败:', error);
      toast.error('无法解析文件，请确保是有效的JSON格式');
      setImportFile(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setImporting(true);
    try {
      const text = await importFile.text();
      const data = JSON.parse(text);
      const token = localStorage.getItem('token');

      const response = await axios.post('/api/user/import', {
        data,
        options: importOptions
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const results = response.data.results;
      const totalSuccess = results.memories.success + results.collections.success + results.series.success;
      const totalFailed = results.memories.failed + results.collections.failed + results.series.failed;
      const totalSkipped = results.memories.skipped;

      toast.success(`导入完成：成功 ${totalSuccess}，跳过 ${totalSkipped}，失败 ${totalFailed}`);
      setImportFile(null);
      setImportPreview(null);
    } catch (error) {
      console.error('导入失败:', error);
      toast.error(error.response?.data?.error || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Download className="text-primary" size={24} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>数据备份与恢复</h2>
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
          {/* 导出区域 */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <h3 className="font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Download size={18} />
              导出数据
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              导出你的所有记忆、收藏、系列等数据，用于备份或迁移到其他设备
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleExport('json')}
                disabled={exporting}
                className="flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <FileJson size={18} />
                )}
                JSON 格式
              </button>
              <button
                onClick={() => handleExport('markdown')}
                disabled={exporting}
                className="flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border hover:bg-gray-50 dark:hover:bg-gray-800"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                {exporting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <FileText size={18} />
                )}
                Markdown 格式
              </button>
            </div>
          </div>

          {/* 导入区域 */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <h3 className="font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Upload size={18} />
              导入数据
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              从之前导出的 JSON 文件恢复数据
            </p>

            {/* 文件选择 */}
            {!importFile ? (
              <label className="block">
                <div 
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <Upload size={32} className="mx-auto mb-2" style={{ color: 'var(--text-secondary)' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>点击选择或拖放 JSON 文件</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>仅支持 .json 格式</p>
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="space-y-3">
                {/* 文件预览 */}
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileJson size={18} className="text-primary" />
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {importFile.name}
                    </span>
                  </div>
                  {importPreview && (
                    <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                      <p>版本: {importPreview.version}</p>
                      <p>导出时间: {new Date(importPreview.exportedAt).toLocaleString('zh-CN')}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {importPreview.stats.totalMemories > 0 && (
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs">
                            {importPreview.stats.totalMemories} 条记忆
                          </span>
                        )}
                        {importPreview.stats.totalCollections > 0 && (
                          <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs">
                            {importPreview.stats.totalCollections} 个收藏夹
                          </span>
                        )}
                        {importPreview.stats.totalSeries > 0 && (
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs">
                            {importPreview.stats.totalSeries} 个系列
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 导入选项 */}
                <div className="space-y-2">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>导入选项</p>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importOptions.importMemories}
                      onChange={(e) => setImportOptions(prev => ({ ...prev, importMemories: e.target.checked }))}
                      className="rounded"
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>导入记忆</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importOptions.importCollections}
                      onChange={(e) => setImportOptions(prev => ({ ...prev, importCollections: e.target.checked }))}
                      className="rounded"
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>导入收藏夹</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importOptions.importSeries}
                      onChange={(e) => setImportOptions(prev => ({ ...prev, importSeries: e.target.checked }))}
                      className="rounded"
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>导入系列</span>
                  </label>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setImportFile(null);
                      setImportPreview(null);
                    }}
                    className="flex-1 py-2 px-4 rounded-lg border transition-colors"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex-1 py-2 px-4 rounded-lg bg-primary text-white font-medium transition-colors hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {importing ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        导入中...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        开始导入
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 提示信息 */}
          <div className="p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text-secondary)' }} />
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <p className="font-medium mb-1">注意事项</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>JSON 格式包含完整数据，可用于恢复</li>
                <li>Markdown 格式适合阅读和归档</li>
                <li>导入时会跳过重复的记忆</li>
                <li>建议定期备份数据</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataBackupRestore;