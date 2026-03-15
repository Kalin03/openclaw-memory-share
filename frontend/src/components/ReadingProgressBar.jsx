import React, { useState, useEffect } from 'react';

const ReadingProgressBar = () => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      // 只有当页面有足够内容时才显示
      if (docHeight > 500) {
        setIsVisible(true);
        const progressPercent = (scrollTop / docHeight) * 100;
        setProgress(Math.min(100, Math.max(0, progressPercent)));
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // 初始检查

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 h-1 z-50 transition-opacity duration-300"
      style={{ backgroundColor: 'var(--bg-tertiary)' }}
    >
      <div 
        className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
      {/* 显示百分比 */}
      <div 
        className="absolute right-2 -top-0.5 transform -translate-y-full px-1.5 py-0.5 rounded text-xs font-medium bg-primary text-white shadow-sm transition-all duration-150"
        style={{ opacity: progress > 5 && progress < 95 ? 1 : 0 }}
      >
        {Math.round(progress)}%
      </div>
    </div>
  );
};

export default ReadingProgressBar;