import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = '/api';

/**
 * 阅读进度追踪 Hook
 * @param {string} memoryId - 记忆ID
 * @param {React.RefObject} contentRef - 内容区域引用
 * @param {number} saveInterval - 自动保存间隔（毫秒）
 */
const useReadingProgress = (memoryId, contentRef, saveInterval = 5000) => {
  const [progress, setProgress] = useState(0);
  const [savedPosition, setSavedPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const lastSavedRef = useRef(0);
  const saveTimeoutRef = useRef(null);

  // 加载已保存的进度
  useEffect(() => {
    if (!memoryId) return;

    const loadProgress = async () => {
      try {
        const res = await axios.get(`${API_URL}/memories/${memoryId}/progress`);
        if (res.data.progress !== undefined) {
          setSavedPosition(res.data.position || 0);
          setProgress(res.data.progress);
        }
      } catch (err) {
        // 忽略错误，可能是首次阅读
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [memoryId]);

  // 计算当前阅读进度
  const calculateProgress = useCallback(() => {
    if (!contentRef?.current) return 0;

    const element = contentRef.current;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight - element.clientHeight;

    if (scrollHeight <= 0) return 100;
    return Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
  }, [contentRef]);

  // 保存进度
  const saveProgress = useCallback(async (position, progressValue) => {
    if (!memoryId) return;

    try {
      await axios.post(`${API_URL}/memories/${memoryId}/progress`, {
        position,
        progress: progressValue
      });
      lastSavedRef.current = position;
    } catch (err) {
      console.error('保存阅读进度失败:', err);
    }
  }, [memoryId]);

  // 监听滚动事件
  useEffect(() => {
    if (!contentRef?.current) return;

    const element = contentRef.current;

    const handleScroll = () => {
      const currentProgress = calculateProgress();
      setProgress(currentProgress);

      // 防抖保存
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        const position = element.scrollTop;
        // 只有位置变化超过100px才保存
        if (Math.abs(position - lastSavedRef.current) > 100) {
          saveProgress(position, currentProgress);
        }
      }, saveInterval);
    };

    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [contentRef, calculateProgress, saveProgress, saveInterval]);

  // 恢复阅读位置
  const restorePosition = useCallback(() => {
    if (!contentRef?.current || savedPosition <= 0) return;

    setTimeout(() => {
      contentRef.current.scrollTo({
        top: savedPosition,
        behavior: 'smooth'
      });
    }, 100);
  }, [contentRef, savedPosition]);

  // 页面卸载时保存
  useEffect(() => {
    return () => {
      if (contentRef?.current && progress > 0) {
        // 同步保存（使用 sendBeacon 确保发送）
        const data = JSON.stringify({
          position: contentRef.current.scrollTop,
          progress
        });
        navigator.sendBeacon(`${API_URL}/memories/${memoryId}/progress`, data);
      }
    };
  }, [memoryId, contentRef, progress]);

  return {
    progress,
    savedPosition,
    isLoading,
    restorePosition,
    saveProgress
  };
};

/**
 * 阅读进度指示器组件
 */
const ReadingProgressBar = ({ progress, showLabel = true }) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200">
      <div 
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
      {showLabel && progress > 0 && progress < 100 && (
        <div 
          className="absolute top-1 right-2 text-xs text-gray-500"
          style={{ transform: 'translateY(-2px)' }}
        >
          {progress}%
        </div>
      )}
    </div>
  );
};

/**
 * 阅读进度提示组件
 */
const ReadingProgressToast = ({ show, position, onRestore, onDismiss }) => {
  if (!show) return null;

  return (
    <div 
      className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3"
      style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
    >
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        上次读到 {position}%，继续阅读？
      </span>
      <button
        onClick={onRestore}
        className="px-3 py-1 text-sm rounded-lg bg-primary text-white hover:opacity-90"
      >
        继续
      </button>
      <button
        onClick={onDismiss}
        className="px-3 py-1 text-sm rounded-lg"
        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
      >
        从头开始
      </button>
    </div>
  );
};

export { useReadingProgress, ReadingProgressBar, ReadingProgressToast };
export default useReadingProgress;