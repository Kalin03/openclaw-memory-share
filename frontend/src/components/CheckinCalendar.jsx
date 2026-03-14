import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, ChevronLeft, ChevronRight, Flame, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const CheckinCalendar = ({ onClose }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (user) {
      fetchCheckinHistory();
    }
  }, [user]);

  const fetchCheckinHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const [historyRes, statusRes] = await Promise.all([
        axios.get('/api/user/checkin/history?days=365', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/user/checkin', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setCheckins(historyRes.data.checkins || []);
      setStats(statusRes.data);
    } catch (error) {
      console.error('获取签到历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取某月的天数
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // 获取某月第一天是星期几
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // 检查某天是否签到
  const isCheckedIn = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return checkins.some(c => c.checkin_date === dateStr);
  };

  // 生成日历网格
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // 填充空白
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, date: null, checkedIn: false });
    }

    // 填充日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      days.push({
        day,
        date,
        checkedIn: isCheckedIn(date)
      });
    }

    return days;
  };

  // 上个月
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // 下个月
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // 月份名称
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // 计算本月签到天数
  const getMonthCheckinCount = () => {
    const days = generateCalendarDays();
    return days.filter(d => d.checkedIn).length;
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Calendar className="text-primary" size={24} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>签到日历</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="p-4 grid grid-cols-3 gap-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
                <Flame size={14} />
              </div>
              <div className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
                {stats.currentStreak}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>连续签到</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="text-green-500 mb-1">📅</div>
              <div className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
                {getMonthCheckinCount()}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>本月签到</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="text-blue-500 mb-1">🎯</div>
              <div className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
                {stats.totalCheckins}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>累计签到</div>
            </div>
          </div>
        )}

        {/* Calendar */}
        <div className="p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronLeft size={20} />
            </button>
            <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              {currentMonth.getFullYear()}年 {monthNames[currentMonth.getMonth()]}
            </div>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day, index) => (
              <div
                key={index}
                className="text-center text-xs font-medium py-2"
                style={{ color: index === 0 || index === 6 ? 'var(--text-secondary)' : 'var(--text-primary)' }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          {loading ? (
            <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              加载中...
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map((day, index) => (
                <div
                  key={index}
                  className={`
                    aspect-square flex items-center justify-center text-sm rounded-lg
                    ${day.day ? 'cursor-default' : ''}
                    ${day.checkedIn 
                      ? 'bg-gradient-to-br from-primary to-secondary text-white font-bold shadow-sm' 
                      : day.day 
                        ? 'hover:bg-gray-100 dark:hover:bg-gray-800' 
                        : ''
                    }
                  `}
                  style={{ 
                    color: day.checkedIn 
                      ? 'white' 
                      : day.day 
                        ? 'var(--text-primary)' 
                        : 'transparent'
                  }}
                  title={day.checkedIn ? '已签到' : day.day ? '未签到' : ''}
                >
                  {day.day || ''}
                  {day.checkedIn && (
                    <span className="absolute text-xs">✓</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-primary to-secondary"></div>
              <span>已签到</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}></div>
              <span>未签到</span>
            </div>
          </div>
        </div>

        {/* Encouragement */}
        {stats && stats.currentStreak > 0 && (
          <div className="p-4 text-center border-t" style={{ borderColor: 'var(--border-color)' }}>
            <p style={{ color: 'var(--text-secondary)' }}>
              🔥 已连续签到 <span className="font-bold text-primary">{stats.currentStreak}</span> 天
              {stats.currentStreak >= 7 && '，太棒了！'}
              {stats.currentStreak >= 30 && ' 🎉'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckinCalendar;