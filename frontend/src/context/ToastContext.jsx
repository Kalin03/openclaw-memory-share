import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Undo2 } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000, options = {}) => {
    const id = Date.now() + Math.random();
    const toast = { 
      id, 
      message, 
      type, 
      duration,
      undoAction: options.undoAction || null,
      undoLabel: options.undoLabel || '撤销'
    };
    
    setToasts(prev => [...prev, toast]);
    
    // 如果有撤销操作，延长显示时间
    const actualDuration = options.undoAction ? 8000 : duration;
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, actualDuration);
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message, duration, options) => addToast(message, 'success', duration, options), [addToast]);
  const error = useCallback((message, duration, options) => addToast(message, 'error', duration, options), [addToast]);
  const info = useCallback((message, duration, options) => addToast(message, 'info', duration, options), [addToast]);
  const warning = useCallback((message, duration, options) => addToast(message, 'warning', duration, options), [addToast]);

  /**
   * 显示带撤销按钮的 Toast
   * @param {string} message - 提示消息
   * @param {function} undoAction - 撤销函数
   * @param {object} options - 其他选项
   */
  const withUndo = useCallback((message, undoAction, options = {}) => {
    return addToast(message, options.type || 'info', options.duration || 8000, {
      undoAction,
      undoLabel: options.undoLabel || '撤销'
    });
  }, [addToast]);

  /**
   * 处理撤销操作
   */
  const handleUndo = useCallback(async (toastId, undoAction) => {
    try {
      await undoAction();
      removeToast(toastId);
      // 显示撤销成功提示
      addToast('已撤销操作', 'success', 2000);
    } catch (error) {
      console.error('撤销失败:', error);
      addToast('撤销失败', 'error', 3000);
    }
  }, [addToast, removeToast]);

  return (
    <ToastContext.Provider value={{ 
      addToast, 
      removeToast, 
      success, 
      error, 
      info, 
      warning,
      withUndo,
      handleUndo
    }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} onUndo={handleUndo} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, removeToast, onUndo }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} onUndo={onUndo} />
      ))}
    </div>
  );
};

const Toast = ({ toast, onClose, onUndo }) => {
  const { message, type, undoAction, undoLabel } = toast;

  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-green-500',
      iconColor: 'text-white'
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-red-500',
      iconColor: 'text-white'
    },
    info: {
      icon: Info,
      bg: 'bg-blue-500',
      iconColor: 'text-white'
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-yellow-500',
      iconColor: 'text-white'
    }
  };

  const { icon: Icon, bg, iconColor } = config[type] || config.info;

  return (
    <div 
      className={`${bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[280px] max-w-[400px] animate-slide-in`}
    >
      <Icon size={20} className={iconColor} />
      <span className="flex-1 text-sm font-medium">{message}</span>
      
      {/* 撤销按钮 */}
      {undoAction && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onUndo(toast.id, undoAction);
          }}
          className="flex items-center gap-1 px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
        >
          <Undo2 size={14} />
          {undoLabel}
        </button>
      )}
      
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="p-1 hover:bg-white/20 rounded transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastProvider;