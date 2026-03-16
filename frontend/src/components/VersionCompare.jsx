import React, { useState, useEffect } from 'react';
import { 
  X, 
  GitCompare, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  User,
  Check,
  ArrowRight
} from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

/**
 * 版本对比组件
 * 对比记忆的不同版本
 */
const VersionCompare = ({ isOpen, onClose, memoryId, versions = [] }) => {
  const [loading, setLoading] = useState(false);
  const [leftVersion, setLeftVersion] = useState(null);
  const [rightVersion, setRightVersion] = useState(null);
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(1);
  const [diffView, setDiffView] = useState('split'); // split, unified

  useEffect(() => {
    if (isOpen && versions.length >= 2) {
      setLeftVersion(versions[0]);
      setRightVersion(versions[1]);
    }
  }, [isOpen, versions]);

  // 计算差异
  const calculateDiff = (left, right) => {
    const leftLines = (left || '').split('\n');
    const rightLines = (right || '').split('\n');
    
    const result = [];
    const maxLen = Math.max(leftLines.length, rightLines.length);
    
    for (let i = 0; i < maxLen; i++) {
      const leftLine = leftLines[i] || '';
      const rightLine = rightLines[i] || '';
      
      if (leftLine === rightLine) {
        result.push({ type: 'equal', left: leftLine, right: rightLine });
      } else {
        if (leftLine && rightLine) {
          result.push({ type: 'modified', left: leftLine, right: rightLine });
        } else if (leftLine) {
          result.push({ type: 'removed', left: leftLine, right: '' });
        } else {
          result.push({ type: 'added', left: '', right: rightLine });
        }
      }
    }
    
    return result;
  };

  // 格式化时间
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 统计变化
  const getStats = () => {
    if (!leftVersion?.content || !rightVersion?.content) return null;
    
    const diff = calculateDiff(leftVersion.content, rightVersion.content);
    const added = diff.filter(d => d.type === 'added').length;
    const removed = diff.filter(d => d.type === 'removed').length;
    const modified = diff.filter(d => d.type === 'modified').length;
    
    return { added, removed, modified, total: diff.length };
  };

  const stats = getStats();
  const diff = leftVersion?.content && rightVersion?.content 
    ? calculateDiff(leftVersion.content, rightVersion.content) 
    : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <GitCompare className="w-5 h-5" />
            <h2 className="text-lg font-semibold">版本对比</h2>
          </div>
          <div className="flex items-center gap-4">
            {/* 视图切换 */}
            <div className="flex bg-white/20 rounded-lg p-1">
              <button
                onClick={() => setDiffView('split')}
                className={`px-3 py-1 rounded text-sm transition-colors
                  ${diffView === 'split' ? 'bg-white text-blue-600' : 'text-white'}
                `}
              >
                分栏
              </button>
              <button
                onClick={() => setDiffView('unified')}
                className={`px-3 py-1 rounded text-sm transition-colors
                  ${diffView === 'unified' ? 'bg-white text-blue-600' : 'text-white'}
                `}
              >
                统一
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 版本选择器 */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">基础版本</label>
            <select
              value={leftIndex}
              onChange={(e) => {
                const idx = parseInt(e.target.value);
                setLeftIndex(idx);
                setLeftVersion(versions[idx]);
              }}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            >
              {versions.map((v, i) => (
                <option key={i} value={i}>
                  版本 {versions.length - i} - {formatTime(v.created_at)}
                </option>
              ))}
            </select>
          </div>
          
          <ArrowRight className="w-5 h-5 text-gray-400 mt-5" />
          
          <div className="flex-1">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">对比版本</label>
            <select
              value={rightIndex}
              onChange={(e) => {
                const idx = parseInt(e.target.value);
                setRightIndex(idx);
                setRightVersion(versions[idx]);
              }}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            >
              {versions.map((v, i) => (
                <option key={i} value={i}>
                  版本 {versions.length - i} - {formatTime(v.created_at)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 统计信息 */}
        {stats && (
          <div className="flex items-center gap-6 px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <span className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 bg-green-500 rounded"></span>
              <span className="text-gray-600 dark:text-gray-400">新增</span>
              <span className="font-medium text-green-600">{stats.added}</span>
            </span>
            <span className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 bg-red-500 rounded"></span>
              <span className="text-gray-600 dark:text-gray-400">删除</span>
              <span className="font-medium text-red-600">{stats.removed}</span>
            </span>
            <span className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 bg-yellow-500 rounded"></span>
              <span className="text-gray-600 dark:text-gray-400">修改</span>
              <span className="font-medium text-yellow-600">{stats.modified}</span>
            </span>
          </div>
        )}

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto">
          {diffView === 'split' ? (
            // 分栏视图
            <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
              {/* 左侧版本 */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3 text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  {leftVersion && formatTime(leftVersion.created_at)}
                  {leftVersion?.author && (
                    <>
                      <span>·</span>
                      <User className="w-4 h-4" />
                      {leftVersion.author}
                    </>
                  )}
                </div>
                <div className="font-mono text-sm space-y-0.5">
                  {diff.map((line, i) => (
                    <div 
                      key={i}
                      className={`px-2 py-0.5 rounded ${
                        line.type === 'removed' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                        line.type === 'modified' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                        'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {line.type === 'removed' && <span className="text-red-500 mr-2">-</span>}
                      {line.type === 'modified' && <span className="text-yellow-500 mr-2">~</span>}
                      {line.left || <span className="text-gray-300">空行</span>}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 右侧版本 */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3 text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  {rightVersion && formatTime(rightVersion.created_at)}
                  {rightVersion?.author && (
                    <>
                      <span>·</span>
                      <User className="w-4 h-4" />
                      {rightVersion.author}
                    </>
                  )}
                </div>
                <div className="font-mono text-sm space-y-0.5">
                  {diff.map((line, i) => (
                    <div 
                      key={i}
                      className={`px-2 py-0.5 rounded ${
                        line.type === 'added' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                        line.type === 'modified' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                        'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {line.type === 'added' && <span className="text-green-500 mr-2">+</span>}
                      {line.type === 'modified' && <span className="text-yellow-500 mr-2">~</span>}
                      {line.right || <span className="text-gray-300">空行</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // 统一视图
            <div className="p-4">
              <div className="font-mono text-sm space-y-0.5">
                {diff.map((line, i) => (
                  <div 
                    key={i}
                    className={`px-2 py-0.5 rounded ${
                      line.type === 'removed' ? 'bg-red-100 dark:bg-red-900/30' :
                      line.type === 'added' ? 'bg-green-100 dark:bg-green-900/30' :
                      line.type === 'modified' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                      ''
                    }`}
                  >
                    {line.type === 'removed' && (
                      <div className="text-red-700 dark:text-red-300">
                        <span className="text-red-500 mr-2">-</span>
                        {line.left}
                      </div>
                    )}
                    {line.type === 'added' && (
                      <div className="text-green-700 dark:text-green-300">
                        <span className="text-green-500 mr-2">+</span>
                        {line.right}
                      </div>
                    )}
                    {line.type === 'modified' && (
                      <>
                        <div className="text-red-700 dark:text-red-300">
                          <span className="text-red-500 mr-2">-</span>
                          {line.left}
                        </div>
                        <div className="text-green-700 dark:text-green-300">
                          <span className="text-green-500 mr-2">+</span>
                          {line.right}
                        </div>
                      </>
                    )}
                    {line.type === 'equal' && (
                      <div className="text-gray-700 dark:text-gray-300">
                        <span className="text-gray-400 mr-2"> </span>
                        {line.left}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionCompare;