import React, { useState } from 'react';
import { 
  Upload, 
  X, 
  FileJson, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const ImportExternalContent = ({ onClose, onImport }) => {
  const toast = useToast();
  const [importType, setImportType] = useState('json');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [file, setFile] = useState(null);

  const importTypes = [
    { 
      id: 'json', 
      label: 'JSON 文件', 
      description: '从 Memory Share 导出的 JSON 文件',
      icon: FileJson,
      accept: '.json'
    },
    { 
      id: 'markdown', 
      label: 'Markdown 文件', 
      description: '从其他应用导出的 Markdown 文件',
      icon: FileText,
      accept: '.md,.markdown,.txt'
    },
    { 
      id: 'flomo', 
      label: 'Flomo 备份', 
      description: '从 Flomo 导出的 JSON 备份文件',
      icon: FileJson,
      accept: '.json'
    },
    { 
      id: 'notion', 
      label: 'Notion 导出', 
      description: '从 Notion 导出的 Markdown/CSV 文件',
      icon: FileText,
      accept: '.md,.csv,.txt'
    }
  ];

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);
    setPreview(null);
    setResults(null);

    try {
      const text = await selectedFile.text();
      
      switch (importType) {
        case 'json':
        case 'flomo':
          await previewJson(text, importType);
          break;
        case 'markdown':
        case 'notion':
          await previewMarkdown(text, importType);
          break;
      }
    } catch (error) {
      console.error('预览失败:', error);
      toast.error('文件解析失败，请检查格式');
    } finally {
      setLoading(false);
    }
  };

  const previewJson = async (text, type) => {
    try {
      const data = JSON.parse(text);
      
      if (type === 'flomo') {
        // Flomo 格式
        const memos = data.memos || data || [];
        setPreview({
          type: 'flomo',
          count: Array.isArray(memos) ? memos.length : 1,
          sample: Array.isArray(memos) ? memos.slice(0, 3).map(m => ({
            content: m.content || m.text || '',
            tags: m.tags || []
          })) : [memos]
        });
      } else {
        // Memory Share 格式
        const memories = data.memories || [];
        setPreview({
          type: 'memory-share',
          count: memories.length,
          stats: data.stats || null,
          sample: memories.slice(0, 3).map(m => ({
            title: m.title || '无标题',
            content: m.content?.substring(0, 100) || '',
            tags: m.tags?.split(',').filter(Boolean) || []
          }))
        });
      }
    } catch (e) {
      throw new Error('JSON 解析失败');
    }
  };

  const previewMarkdown = async (text, type) => {
    const lines = text.split('\n');
    const headers = lines.filter(l => l.startsWith('#'));
    
    setPreview({
      type: 'markdown',
      count: 1,
      title: headers[0]?.replace(/^#+\s*/, '') || '未命名文档',
      contentLength: text.length,
      wordCount: text.replace(/\s+/g, '').length,
      lineCount: lines.length,
      sample: [{
        title: headers[0]?.replace(/^#+\s*/, '') || '未命名文档',
        content: text.substring(0, 200) + '...'
      }]
    });
  };

  const handleImport = async () => {
    if (!file || !preview) return;

    setImporting(true);
    
    try {
      const token = localStorage.getItem('token');
      const text = await file.text();
      
      let importData = [];
      
      switch (importType) {
        case 'json':
          importData = parseMemoryShareJson(text);
          break;
        case 'flomo':
          importData = parseFlomoJson(text);
          break;
        case 'markdown':
        case 'notion':
          importData = parseMarkdown(text);
          break;
      }

      // 批量导入
      let successCount = 0;
      let failCount = 0;

      for (const item of importData) {
        try {
          await axios.post('/api/memories', item, {
            headers: { Authorization: `Bearer ${token}` }
          });
          successCount++;
        } catch (err) {
          failCount++;
        }
      }

      setResults({
        total: importData.length,
        success: successCount,
        failed: failCount
      });

      if (successCount > 0) {
        toast.success(`成功导入 ${successCount} 条记忆`);
        if (onImport) onImport();
      }
    } catch (error) {
      console.error('导入失败:', error);
      toast.error('导入失败');
    } finally {
      setImporting(false);
    }
  };

  const parseMemoryShareJson = (text) => {
    const data = JSON.parse(text);
    return (data.memories || []).map(m => ({
      title: m.title || '无标题',
      content: m.content || '',
      tags: m.tags || '',
      visibility: m.visibility || 'public'
    }));
  };

  const parseFlomoJson = (text) => {
    const data = JSON.parse(text);
    const memos = data.memos || data || [];
    const memosArray = Array.isArray(memos) ? memos : [memos];
    
    return memosArray.map(m => ({
      title: (m.content || m.text || '').substring(0, 50) || 'Flomo 导入',
      content: m.content || m.text || '',
      tags: (m.tags || []).join(','),
      visibility: 'public'
    }));
  };

  const parseMarkdown = (text) => {
    const lines = text.split('\n');
    const titleLine = lines.find(l => l.startsWith('#'));
    const title = titleLine?.replace(/^#+\s*/, '') || 'Markdown 导入';
    
    return [{
      title,
      content: text,
      tags: '',
      visibility: 'public'
    }];
  };

  const resetImport = () => {
    setFile(null);
    setPreview(null);
    setResults(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Upload className="text-primary" size={24} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>导入外部内容</h2>
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
          {/* Import Type Selection */}
          {!file && (
            <div className="grid grid-cols-2 gap-2">
              {importTypes.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setImportType(type.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      importType === type.id ? 'border-primary bg-primary/10' : ''
                    }`}
                    style={{ 
                      borderColor: importType === type.id ? undefined : 'var(--border-color)'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={18} style={{ color: 'var(--primary)' }} />
                      <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        {type.label}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {type.description}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* File Input */}
          {!file && (
            <label className="block">
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <Upload size={32} className="mx-auto mb-2" style={{ color: 'var(--text-secondary)' }} />
                <p style={{ color: 'var(--text-primary)' }}>点击选择文件</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  支持 {importTypes.find(t => t.id === importType)?.accept} 格式
                </p>
              </div>
              <input
                type="file"
                accept={importTypes.find(t => t.id === importType)?.accept}
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <Loader2 size={32} className="animate-spin mx-auto mb-3 text-primary" />
              <p style={{ color: 'var(--text-secondary)' }}>解析文件中...</p>
            </div>
          )}

          {/* Preview */}
          {preview && !results && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    预览
                  </span>
                  <span className="text-sm px-2 py-0.5 rounded bg-primary/20 text-primary">
                    {preview.count} 条内容
                  </span>
                </div>
                
                {preview.stats && (
                  <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                    原始数据：{preview.stats.totalMemories} 记忆，{preview.stats.totalComments} 评论
                  </p>
                )}

                <div className="space-y-2 mt-3">
                  {preview.sample?.map((item, i) => (
                    <div key={i} className="p-2 rounded text-sm" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <p style={{ color: 'var(--text-primary)' }}>
                        {item.title || item.content?.substring(0, 50) || '...'}
                      </p>
                      {item.tags?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {item.tags.slice(0, 3).map((tag, j) => (
                            <span key={j} className="text-xs px-1 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={resetImport}
                  className="flex-1 py-2 rounded-lg border"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                >
                  重新选择
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex-1 py-2 rounded-lg bg-primary text-white font-medium flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      导入中...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      确认导入
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <CheckCircle size={48} className="mx-auto mb-3 text-green-500" />
              <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                导入完成
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{results.total}</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>总计</div>
                </div>
                <div className="p-2 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <div className="font-bold text-lg text-green-500">{results.success}</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>成功</div>
                </div>
                <div className="p-2 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <div className="font-bold text-lg text-red-500">{results.failed}</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>失败</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 rounded-lg bg-primary text-white font-medium"
              >
                完成
              </button>
            </div>
          )}

          {/* Tips */}
          {!file && !preview && (
            <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <p className="font-medium mb-1">💡 导入提示</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>支持从 Memory Share、Flomo、Notion 等平台导入</li>
                <li>导入的内容将成为你的公开记忆</li>
                <li>重复内容会自动跳过</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportExternalContent;