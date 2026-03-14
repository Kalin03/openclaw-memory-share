import React, { useState, useEffect } from 'react';
import { Sun, Moon, Clock, Settings } from 'lucide-react';

const AutoDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('07:00');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // 加载保存的设置
    const savedAutoMode = localStorage.getItem('autoDarkMode') !== 'false';
    const savedStartTime = localStorage.getItem('darkModeStartTime') || '19:00';
    const savedEndTime = localStorage.getItem('darkModeEndTime') || '07:00';
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';

    setAutoMode(savedAutoMode);
    setStartTime(savedStartTime);
    setEndTime(savedEndTime);

    if (savedAutoMode) {
      checkAndUpdateDarkMode(savedStartTime, savedEndTime);
    } else {
      setIsDarkMode(savedDarkMode);
      applyDarkMode(savedDarkMode);
    }
  }, []);

  useEffect(() => {
    if (!autoMode) return;

    // 每分钟检查一次
    const interval = setInterval(() => {
      checkAndUpdateDarkMode(startTime, endTime);
    }, 60000);

    return () => clearInterval(interval);
  }, [autoMode, startTime, endTime]);

  const checkAndUpdateDarkMode = (start, end) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    let shouldBeDark;
    if (startMinutes > endMinutes) {
      // 跨天，例如 19:00 - 07:00
      shouldBeDark = currentTime >= startMinutes || currentTime < endMinutes;
    } else {
      // 同一天，例如 12:00 - 14:00
      shouldBeDark = currentTime >= startMinutes && currentTime < endMinutes;
    }

    setIsDarkMode(shouldBeDark);
    applyDarkMode(shouldBeDark);
  };

  const applyDarkMode = (dark) => {
    if (dark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    applyDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
  };

  const toggleAutoMode = () => {
    const newAutoMode = !autoMode;
    setAutoMode(newAutoMode);
    localStorage.setItem('autoDarkMode', String(newAutoMode));

    if (newAutoMode) {
      checkAndUpdateDarkMode(startTime, endTime);
    }
  };

  const handleTimeChange = (type, value) => {
    if (type === 'start') {
      setStartTime(value);
      localStorage.setItem('darkModeStartTime', value);
    } else {
      setEndTime(value);
      localStorage.setItem('darkModeEndTime', value);
    }

    if (autoMode) {
      checkAndUpdateDarkMode(
        type === 'start' ? value : startTime,
        type === 'end' ? value : endTime
      );
    }
  };

  return (
    <div 
      className="rounded-lg p-4"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isDarkMode ? (
            <Moon size={20} className="text-blue-400" />
          ) : (
            <Sun size={20} className="text-yellow-500" />
          )}
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {isDarkMode ? '深色模式' : '浅色模式'}
          </span>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Settings size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>

      {/* Quick Toggle */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={toggleDarkMode}
          disabled={autoMode}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            isDarkMode
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-yellow-500/20 text-yellow-600'
          } ${autoMode ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isDarkMode ? '🌙 深色' : '☀️ 浅色'}
        </button>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          {/* Auto Mode Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                自动切换
              </span>
            </div>
            <button
              onClick={toggleAutoMode}
              className={`w-12 h-6 rounded-full transition-colors ${
                autoMode ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  autoMode ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Time Settings */}
          {autoMode && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm w-20" style={{ color: 'var(--text-secondary)' }}>
                  开启时间
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleTimeChange('start', e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg text-sm"
                  style={{ 
                    backgroundColor: 'var(--bg-tertiary)', 
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm w-20" style={{ color: 'var(--text-secondary)' }}>
                  关闭时间
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => handleTimeChange('end', e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg text-sm"
                  style={{ 
                    backgroundColor: 'var(--bg-tertiary)', 
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                />
              </div>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                深色模式将在 {startTime} - {endTime} 之间自动启用
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutoDarkMode;