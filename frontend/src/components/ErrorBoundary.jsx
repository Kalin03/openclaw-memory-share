import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console in development
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-screen flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          <div 
            className="max-w-md w-full p-8 rounded-xl text-center"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              出错了
            </h1>
            
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              抱歉，页面遇到了一些问题。请尝试刷新页面或返回首页。
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div 
                className="mb-6 p-4 rounded-lg text-left text-sm overflow-auto max-h-40"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                <p className="font-mono text-red-500">{this.state.error.toString()}</p>
              </div>
            )}
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90 transition-colors"
              >
                <RefreshCw size={18} />
                刷新页面
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-80 transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                <Home size={18} />
                返回首页
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;