import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  X, 
  Moon, 
  Sun, 
  Monitor,
  Bell,
  Globe,
  Lock,
  Eye,
  Mail,
  Save,
  RefreshCw
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';

const UserPreferences = ({ onClose }) => {
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    // 外观
    theme: 'system',
    fontSize: 'medium',
    
    // 通知
    emailNotifications: true,
    browserNotifications: false,
    
    // 隐私
    profileVisibility: 'public',
    showEmail: false,
    showActivity: true,
    
    // 编辑器
    autoSave: true,
    autoSaveInterval: 30,
    defaultVisibility: 'public',
    
    // 阅读
    fontSize_reading: 'medium',
    lineSpacing: 'normal',
    showReadingTime: true,
    showWordCount: true
  });

  const themeOptions = [
    { value: 'light', label: '浅色', icon: Sun },
    { value: 'dark', label: '深色', icon: Moon },
    { value: 'system', label: '跟随系统', icon: Monitor }
  ];

  const fontSizeOptions = [
    { value: 'small', label: '小' },
    { value: 'medium', label: '中' },
    { value: 'large', label: '大' }
  ];

  const visibilityOptions = [
    { value: 'public', label: '公开' },
    { value: 'followers', label: '仅关注者' },
    { value: 'private', label: '私密' }
  ];

  useEffect(() => {
    // 从本地存储加载偏好设置
    const savedPrefs = localStorage.getItem('user-preferences');
    if (savedPrefs) {
      try {
        setPreferences(prev => ({ ...prev, ...JSON.parse(savedPrefs) }));
      } catch (e) {
        console.error('加载偏好设置失败:', e);
      }
    }
  }, []);

  const handleSave = async () => {
    setLoading(true);
    
    try {
      // 保存到本地存储
      localStorage.setItem('user-preferences', JSON.stringify(preferences));
      
      // 应用主题
      if (preferences.theme !== theme) {
        setTheme(preferences.theme);
      }
      
      // 应用字体大小
      document.documentElement.setAttribute('data-font-size', preferences.fontSize);
      document.documentElement.setAttribute('data-line-spacing', preferences.lineSpacing);
      
      toast.success('偏好设置已保存');
    } catch (error) {
      console.error('保存偏好设置失败:', error);
      toast.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('确定要重置所有偏好设置为默认值吗？')) return;
    
    const defaultPrefs = {
      theme: 'system',
      fontSize: 'medium',
      emailNotifications: true,
      browserNotifications: false,
      profileVisibility: 'public',
      showEmail: false,
      showActivity: true,
      autoSave: true,
      autoSaveInterval: 30,
      defaultVisibility: 'public',
      fontSize_reading: 'medium',
      lineSpacing: 'normal',
      showReadingTime: true,
      showWordCount: true
    };
    
    setPreferences(defaultPrefs);
    localStorage.setItem('user-preferences', JSON.stringify(defaultPrefs));
    setTheme(defaultPrefs.theme);
    document.documentElement.setAttribute('data-font-size', 'medium');
    document.documentElement.setAttribute('data-line-spacing', 'normal');
    toast.success('已重置为默认设置');
  };

  const updatePreference = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Settings className="text-primary" size={24} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>偏好设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* 外观设置 */}
          <section>
            <h3 className="font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Sun size={18} />
              外观
            </h3>
            <div className="space-y-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              {/* 主题 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  主题模式
                </label>
                <div className="flex gap-2">
                  {themeOptions.map(option => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => updatePreference('theme', option.value)}
                        className={`flex-1 p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                          preferences.theme === option.value ? 'border-primary bg-primary/10' : ''
                        }`}
                        style={{ 
                          borderColor: preferences.theme === option.value ? undefined : 'var(--border-color)'
                        }}
                      >
                        <Icon size={20} style={{ color: preferences.theme === option.value ? 'var(--primary)' : 'var(--text-secondary)' }} />
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 字体大小 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  界面字体大小
                </label>
                <div className="flex gap-2">
                  {fontSizeOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => updatePreference('fontSize', option.value)}
                      className={`flex-1 py-2 rounded-lg border-2 transition-all ${
                        preferences.fontSize === option.value ? 'border-primary bg-primary/10' : ''
                      }`}
                      style={{ 
                        borderColor: preferences.fontSize === option.value ? undefined : 'var(--border-color)'
                      }}
                    >
                      <span style={{ color: 'var(--text-primary)' }}>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 编辑器设置 */}
          <section>
            <h3 className="font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Eye size={18} />
              编辑器
            </h3>
            <div className="space-y-3 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <label className="flex items-center justify-between">
                <span style={{ color: 'var(--text-primary)' }}>自动保存草稿</span>
                <input
                  type="checkbox"
                  checked={preferences.autoSave}
                  onChange={(e) => updatePreference('autoSave', e.target.checked)}
                  className="w-5 h-5 rounded"
                />
              </label>
              
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--text-primary)' }}>自动保存间隔（秒）</span>
                <input
                  type="number"
                  value={preferences.autoSaveInterval}
                  onChange={(e) => updatePreference('autoSaveInterval', parseInt(e.target.value) || 30)}
                  className="w-20 px-2 py-1 rounded text-center"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  min={10}
                  max={300}
                />
              </div>

              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--text-primary)' }}>默认可见性</span>
                <select
                  value={preferences.defaultVisibility}
                  onChange={(e) => updatePreference('defaultVisibility', e.target.value)}
                  className="px-3 py-1 rounded"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  {visibilityOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* 阅读设置 */}
          <section>
            <h3 className="font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Globe size={18} />
              阅读
            </h3>
            <div className="space-y-3 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  阅读字体大小
                </label>
                <div className="flex gap-2">
                  {fontSizeOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => updatePreference('fontSize_reading', option.value)}
                      className={`flex-1 py-2 rounded-lg border-2 transition-all ${
                        preferences.fontSize_reading === option.value ? 'border-primary bg-primary/10' : ''
                      }`}
                      style={{ 
                        borderColor: preferences.fontSize_reading === option.value ? undefined : 'var(--border-color)'
                      }}
                    >
                      <span style={{ color: 'var(--text-primary)' }}>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between">
                <span style={{ color: 'var(--text-primary)' }}>显示阅读时间</span>
                <input
                  type="checkbox"
                  checked={preferences.showReadingTime}
                  onChange={(e) => updatePreference('showReadingTime', e.target.checked)}
                  className="w-5 h-5 rounded"
                />
              </label>

              <label className="flex items-center justify-between">
                <span style={{ color: 'var(--text-primary)' }}>显示字数统计</span>
                <input
                  type="checkbox"
                  checked={preferences.showWordCount}
                  onChange={(e) => updatePreference('showWordCount', e.target.checked)}
                  className="w-5 h-5 rounded"
                />
              </label>
            </div>
          </section>

          {/* 通知设置 */}
          <section>
            <h3 className="font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Bell size={18} />
              通知
            </h3>
            <div className="space-y-3 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <label className="flex items-center justify-between">
                <span style={{ color: 'var(--text-primary)' }}>邮件通知</span>
                <input
                  type="checkbox"
                  checked={preferences.emailNotifications}
                  onChange={(e) => updatePreference('emailNotifications', e.target.checked)}
                  className="w-5 h-5 rounded"
                />
              </label>

              <label className="flex items-center justify-between">
                <span style={{ color: 'var(--text-primary)' }}>浏览器通知</span>
                <input
                  type="checkbox"
                  checked={preferences.browserNotifications}
                  onChange={(e) => {
                    if (e.target.checked && 'Notification' in window) {
                      Notification.requestPermission();
                    }
                    updatePreference('browserNotifications', e.target.checked);
                  }}
                  className="w-5 h-5 rounded"
                />
              </label>
            </div>
          </section>

          {/* 隐私设置 */}
          <section>
            <h3 className="font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Lock size={18} />
              隐私
            </h3>
            <div className="space-y-3 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--text-primary)' }}>个人主页可见性</span>
                <select
                  value={preferences.profileVisibility}
                  onChange={(e) => updatePreference('profileVisibility', e.target.value)}
                  className="px-3 py-1 rounded"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  {visibilityOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center justify-between">
                <span style={{ color: 'var(--text-primary)' }}>显示邮箱</span>
                <input
                  type="checkbox"
                  checked={preferences.showEmail}
                  onChange={(e) => updatePreference('showEmail', e.target.checked)}
                  className="w-5 h-5 rounded"
                />
              </label>

              <label className="flex items-center justify-between">
                <span style={{ color: 'var(--text-primary)' }}>显示活动状态</span>
                <input
                  type="checkbox"
                  checked={preferences.showActivity}
                  onChange={(e) => updatePreference('showActivity', e.target.checked)}
                  className="w-5 h-5 rounded"
                />
              </label>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t shrink-0 flex gap-3" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg border flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
          >
            <RefreshCw size={16} />
            重置
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-primary text-white font-medium flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserPreferences;