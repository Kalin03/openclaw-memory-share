import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message, duration) => addToast(message, 'success', duration), [addToast]);
  const error = useCallback((message, duration) => addToast(message, 'error', duration), [addToast]);
  const info = useCallback((message, duration) => addToast(message, 'info', duration), [addToast]);
  const warning = useCallback((message, duration) => addToast(message, 'warning', duration), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const Toast = ({ toast, onClose }) => {
  const { message, type } = toast;

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
      onClick={onClose}
    >
      <Icon size={20} className={iconColor} />
      <span className="flex-1 text-sm font-medium">{message}</span>
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