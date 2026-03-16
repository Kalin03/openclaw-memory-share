import React, { useState, useEffect } from 'react';
import { 
  X, 
  BookOpen, 
  Type, 
  Sun, 
  Moon,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Settings,
  Maximize2,
  Minimize2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

/**
 * 记忆阅读模式组件
 * 提供沉浸式阅读体验
 */
const ReadingMode = ({ isOpen, onClose, memory, onPrev, onNext, hasPrev, hasNext }) => {
  const [fontSize, setFontSize] = useState(18); // 14, 16, 18, 20, 22
  const [theme, setTheme] = useState('light'); // light, dark, sepia
  const [showTTS, setShowTTS] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 字体大小选项
  const fontSizes = [
    { value: 14, label: '小' },
    { value: 16, label: '标准' },
    { value: 18, label: '中' },
    { value: 20, label: '大' },
    { value: 22, label: '特大' }
  ];

  // 主题配置
  const themes = {
    light: {
      bg: 'bg-white',
      text: 'text-gray-900',
      secondary: 'text-gray-500'
    },
    dark: {
      bg: 'bg-gray-900',
      text: 'text-gray-100',
      secondary: 'text-gray-400'
    },
    sepia: {
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      secondary: 'text-amber-700'
    }
  };

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasPrev && onPrev) onPrev();
          break;
        case 'ArrowRight':
          if (hasNext && onNext) onNext();
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrev, hasNext]);

  // 语音朗读
  const handleTTS = () => {
    if (!memory?.content) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(
      `${memory.title}. ${memory.content.replace(/[#*`_\[\]]/g, '')}`
    );
    utterance.lang = 'zh-CN';
    utterance.rate = 1;
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setShowTTS(true);
  };

  // 切换全屏
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 格式化时间
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen || !memory) return null;

  const currentTheme = themes[theme];

  return (
    <div className={`fixed inset-0 z-[100] ${currentTheme.bg} overflow-y-auto`}>
      {/* 顶部工具栏 */}
      <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b
        ${theme === 'dark' ? 'border-gray-800 bg-gray-900/95' : 'border-gray-200 bg-white/95'}
        backdrop-blur-sm
      `}>
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
              ${currentTheme.text}
            `}
            title="退出阅读模式 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          <span className={`text-sm ${currentTheme.secondary}`}>
            阅读模式
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 语音朗读 */}
          <button
            onClick={handleTTS}
            className={`p-2 rounded-lg transition-colors
              ${isSpeaking 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                : `hover:bg-gray-100 dark:hover:bg-gray-800 ${currentTheme.text}`
              }
            `}
            title={isSpeaking ? '停止朗读' : '语音朗读'}
          >
            {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* 设置 */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
              ${currentTheme.text}
            `}
            title="阅读设置"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* 全屏 */}
          <button
            onClick={toggleFullscreen}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
              ${currentTheme.text}
            `}
            title={isFullscreen ? '退出全屏' : '全屏模式'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className={`sticky top-16 z-10 mx-auto max-w-3xl px-6 py-4 border-b
          ${theme === 'dark' ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'}
        `}>
          <div className="flex items-center gap-8">
            {/* 字体大小 */}
            <div className="flex items-center gap-3">
              <Type className={`w-4 h-4 ${currentTheme.secondary}`} />
              <div className="flex gap-1">
                {fontSizes.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => setFontSize(size.value)}
                    className={`px-3 py-1 rounded text-sm transition-colors
                      ${fontSize === size.value
                        ? 'bg-blue-500 text-white'
                        : `${currentTheme.text} hover:bg-gray-200 dark:hover:bg-gray-700`
                      }
                    `}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 主题 */}
            <div className="flex items-center gap-3">
              <span className={`text-sm ${currentTheme.secondary}`}>主题</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`w-8 h-8 rounded-full bg-white border-2 flex items-center justify-center
                    ${theme === 'light' ? 'border-blue-500' : 'border-gray-300'}
                  `}
                  title="亮色"
                >
                  <Sun className="w-4 h-4 text-yellow-500" />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`w-8 h-8 rounded-full bg-gray-900 border-2 flex items-center justify-center
                    ${theme === 'dark' ? 'border-blue-500' : 'border-gray-300'}
                  `}
                  title="暗色"
                >
                  <Moon className="w-4 h-4 text-gray-300" />
                </button>
                <button
                  onClick={() => setTheme('sepia')}
                  className={`w-8 h-8 rounded-full bg-amber-50 border-2 flex items-center justify-center
                    ${theme === 'sepia' ? 'border-blue-500' : 'border-gray-300'}
                  `}
                  title="护眼"
                >
                  <BookOpen className="w-4 h-4 text-amber-700" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 内容区域 */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* 标题 */}
        <h1 
          className={`text-3xl font-bold mb-6 leading-tight ${currentTheme.text}`}
          style={{ fontSize: `${fontSize + 6}px` }}
        >
          {memory.title || '无标题'}
        </h1>

        {/* 元信息 */}
        <div className={`flex items-center gap-4 mb-8 pb-8 border-b
          ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}
        `}>
          <span className={`${currentTheme.secondary}`}>
            {memory.username || '匿名'}
          </span>
          <span className={currentTheme.secondary}>·</span>
          <span className={currentTheme.secondary}>
            {formatTime(memory.created_at)}
          </span>
          <span className={currentTheme.secondary}>·</span>
          <span className={currentTheme.secondary}>
            {Math.ceil((memory.content?.length || 0) / 500)} 分钟阅读
          </span>
        </div>

        {/* 正文 */}
        <article 
          className={`prose prose-lg max-w-none ${currentTheme.text}`}
          style={{ fontSize: `${fontSize}px` }}
        >
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className={`text-2xl font-bold mt-8 mb-4 ${currentTheme.text}`}>{children}</h1>,
              h2: ({ children }) => <h2 className={`text-xl font-bold mt-6 mb-3 ${currentTheme.text}`}>{children}</h2>,
              h3: ({ children }) => <h3 className={`text-lg font-bold mt-4 mb-2 ${currentTheme.text}`}>{children}</h3>,
              p: ({ children }) => <p className={`mb-4 leading-relaxed ${currentTheme.text}`}>{children}</p>,
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline 
                  ? <code className={`px-1.5 py-0.5 rounded text-sm ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>{children}</code>
                  : <code className="block p-4 rounded-lg overflow-x-auto text-sm bg-gray-900 text-gray-100 my-4">{children}</code>;
              },
              blockquote: ({ children }) => (
                <blockquote className={`border-l-4 pl-4 my-4 italic ${theme === 'dark' ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-600'}`}>
                  {children}
                </blockquote>
              ),
              ul: ({ children }) => <ul className={`list-disc list-inside mb-4 space-y-1 ${currentTheme.text}`}>{children}</ul>,
              ol: ({ children }) => <ol className={`list-decimal list-inside mb-4 space-y-1 ${currentTheme.text}`}>{children}</ol>,
              a: ({ href, children }) => (
                <a href={href} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              )
            }}
          >
            {memory.content || '暂无内容'}
          </ReactMarkdown>
        </article>

        {/* 标签 */}
        {memory.tags && (
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-wrap gap-2">
              {memory.tags.split(',').filter(Boolean).map((tag, i) => (
                <span 
                  key={i}
                  className={`px-3 py-1 rounded-full text-sm
                    ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}
                  `}
                >
                  #{tag.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <div className={`sticky bottom-0 flex items-center justify-between px-6 py-4 border-t
        ${theme === 'dark' ? 'border-gray-800 bg-gray-900/95' : 'border-gray-200 bg-white/95'}
        backdrop-blur-sm
      `}>
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
            ${hasPrev 
              ? `hover:bg-gray-100 dark:hover:bg-gray-800 ${currentTheme.text}`
              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }
          `}
        >
          <ChevronLeft className="w-5 h-5" />
          上一篇
        </button>

        <button
          onClick={onNext}
          disabled={!hasNext}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
            ${hasNext 
              ? `hover:bg-gray-100 dark:hover:bg-gray-800 ${currentTheme.text}`
              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }
          `}
        >
          下一篇
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ReadingMode;