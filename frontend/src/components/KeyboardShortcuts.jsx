import { useState, useEffect, useCallback } from 'react';

// 快捷键配置
const SHORTCUTS = [
  { key: 'N', description: '新建记忆', category: '操作' },
  { key: '/', description: '搜索', category: '导航' },
  { key: 'R', description: '随机记忆', category: '导航' },
  { key: 'H', description: '首页', category: '导航' },
  { key: 'P', description: '个人主页', category: '导航' },
  { key: '?', description: '显示快捷键帮助', category: '帮助' },
  { key: 'Esc', description: '关闭弹窗', category: '操作' },
];

// 快捷键帮助弹窗组件
export function ShortcutsHelp({ isOpen, onClose }) {
  if (!isOpen) return null;

  const groupedShortcuts = SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) acc[shortcut.category] = [];
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            ⌨️ 键盘快捷键
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
          <div key={category} className="mb-4 last:mb-0">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              {category}
            </h3>
            <div className="space-y-2">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">
                    {shortcut.description}
                  </span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            按 <kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">?</kbd> 可随时打开此帮助
          </p>
        </div>
      </div>
    </div>
  );
}

// 快捷键 Hook
export function useKeyboardShortcuts({
  onCreateMemory,
  onFocusSearch,
  onRandomMemory,
  onGoHome,
  onGoProfile,
  onShowHelp,
  onCloseModal,
  isEnabled = true,
}) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback((e) => {
    // 如果在输入框中，不触发快捷键（除了 Esc）
    const isInputFocused = 
      document.activeElement.tagName === 'INPUT' || 
      document.activeElement.tagName === 'TEXTAREA' ||
      document.activeElement.isContentEditable;

    // Esc 键始终有效
    if (e.key === 'Escape') {
      onCloseModal?.();
      setShowHelp(false);
      return;
    }

    // 如果在输入框中，不响应其他快捷键
    if (isInputFocused) return;

    // ? 键显示帮助
    if (e.key === '?') {
      e.preventDefault();
      setShowHelp(prev => !prev);
      onShowHelp?.();
      return;
    }

    // 其他快捷键需要检查 Alt 或 Ctrl 修饰键避免冲突
    const key = e.key.toLowerCase();

    if (key === 'n' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      onCreateMemory?.();
    } else if (key === '/' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      onFocusSearch?.();
    } else if (key === 'r' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      onRandomMemory?.();
    } else if (key === 'h' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      onGoHome?.();
    } else if (key === 'p' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      onGoProfile?.();
    }
  }, [onCreateMemory, onFocusSearch, onRandomMemory, onGoHome, onGoProfile, onShowHelp, onCloseModal]);

  useEffect(() => {
    if (!isEnabled) return;
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, isEnabled]);

  return {
    showHelp,
    setShowHelp,
    ShortcutsHelp: () => <ShortcutsHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
  };
}

export default { useKeyboardShortcuts, ShortcutsHelp };
