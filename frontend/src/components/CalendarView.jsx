import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, FileText, Calendar as CalendarIcon, TrendingUp } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const CalendarView = ({ onClose, onMemoryClick, userId }) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [calendarData, setCalendarData] = useState([]);
  const [monthStats, setMonthStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateMemories, setDateMemories] = useState([]);
  const [loadingDate, setLoadingDate] = useState(false);

  useEffect(() => {
    fetchCalendarData();
  }, [currentYear, currentMonth, userId]);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: currentYear,
        month: currentMonth
      });
      if (userId) {
        params.append('userId', userId);
      }
      
      const res = await axios.get(`${API_URL}/memories/calendar?${params}`);
      setCalendarData(res.data.calendarData);
      setMonthStats(res.data.monthStats);
    } catch (error) {
      console.error('获取日历数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDateMemories = async (date) => {
    setLoadingDate(true);
    try {
      const params = new URLSearchParams({
        date,
        limit: 20
      });
      if (userId) {
        params.append('userId', userId);
      }
      
      const res = await axios.get(`${API_URL}/memories/by-date/${date}?${params}`);
      setDateMemories(res.data.memories);
    } catch (error) {
      console.error('获取日期记忆失败:', error);
      setDateMemories([]);
    } finally {
      setLoadingDate(false);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setDateMemories([]);
    fetchDateMemories(date);
  };

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
    setDateMemories([]);
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
    setDateMemories([]);
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
  };

  // 生成日历网格
  const generateCalendarGrid = () => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const startPadding = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = lastDay.getDate();

    const days = [];
    
    // 上月填充
    for (let i = 0; i < startPadding; i++) {
      days.push({ type: 'padding', key: `padding-${i}` });
    }
    
    // 当月日期
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = calendarData.find(d => d.date === dateStr);
      const isToday = dateStr === today.toISOString().split('T')[0];
      
      days.push({
        type: 'day',
        day,
        date: dateStr,
        count: dayData?.count || 0,
        previews: dayData?.previews || [],
        isToday
      });
    }
    
    return days;
  };

  const days = generateCalendarGrid();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  // 颜色强度映射
  const getIntensityColor = (count) => {
    if (count === 0) return 'var(--bg-tertiary)';
    if (count === 1) return 'rgba(59, 130, 246, 0.3)';
    if (count === 2) return 'rgba(59, 130, 246, 0.5)';
    if (count <= 4) return 'rgba(59, 130, 246, 0.7)';
    return 'rgba(59, 130, 246, 1)';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <CalendarIcon size={24} className="text-primary" />
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>记忆日历</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <>
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded-lg hover:opacity-80 transition-colors"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {currentYear}年 {monthNames[currentMonth - 1]}
                  </h3>
                  <button
                    onClick={goToToday}
                    className="px-3 py-1 text-sm rounded-lg bg-primary text-white hover:opacity-90"
                  >
                    今天
                  </button>
                </div>
                
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-lg hover:opacity-80 transition-colors"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Month Stats */}
              {monthStats && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="rounded-lg p-4 text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <p className="text-2xl font-bold text-primary">{monthStats.total}</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>本月记忆</p>
                  </div>
                  <div className="rounded-lg p-4 text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{monthStats.activeDays}</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>活跃天数</p>
                  </div>
                  {monthStats.mostActiveDay && (
                    <div className="rounded-lg p-4 text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{monthStats.mostActiveDay.count}</p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        最活跃: {monthStats.mostActiveDay.date.slice(5)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Calendar Grid */}
              <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                {/* Week Day Headers */}
                <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  {weekDays.map(day => (
                    <div 
                      key={day} 
                      className="py-2 text-center text-sm font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Days */}
                <div className="grid grid-cols-7">
                  {days.map((day, index) => {
                    if (day.type === 'padding') {
                      return <div key={day.key} className="h-16 md:h-20"></div>;
                    }
                    
                    return (
                      <div
                        key={day.date}
                        onClick={() => day.count > 0 && handleDateClick(day.date)}
                        className={`h-16 md:h-20 border-t p-1 relative transition-colors ${
                          day.count > 0 ? 'cursor-pointer hover:opacity-90' : ''
                        }`}
                        style={{ 
                          borderColor: 'var(--border-color)',
                          backgroundColor: selectedDate === day.date ? 'var(--bg-tertiary)' : 'transparent'
                        }}
                      >
                        <div className="flex items-center justify-between h-full">
                          <span 
                            className={`text-sm font-medium ${day.isToday ? 'text-primary' : ''}`}
                            style={{ color: day.isToday ? undefined : 'var(--text-primary)' }}
                          >
                            {day.day}
                          </span>
                          
                          {day.count > 0 && (
                            <span 
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: getIntensityColor(day.count) }}
                            >
                              {day.count > 9 ? '9+' : day.count}
                            </span>
                          )}
                        </div>
                        
                        {day.count > 0 && (
                          <div className="absolute bottom-1 left-1 right-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                            <div 
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min(day.count * 20, 100)}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Date Memories */}
              {selectedDate && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <FileText size={18} />
                    {selectedDate} 的记忆 ({dateMemories.length})
                  </h4>
                  
                  {loadingDate ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  ) : dateMemories.length > 0 ? (
                    <div className="space-y-2">
                      {dateMemories.map(memory => (
                        <div
                          key={memory.id}
                          onClick={() => onMemoryClick && onMemoryClick(memory)}
                          className="p-3 rounded-lg cursor-pointer hover:opacity-90 transition-colors"
                          style={{ backgroundColor: 'var(--bg-secondary)' }}
                        >
                          <h5 className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {memory.title || '无标题'}
                          </h5>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              by {memory.username}
                            </span>
                            {memory.tags && (
                              <span className="text-xs text-primary truncate">
                                {JSON.parse(memory.tags).slice(0, 2).map(t => `#${t}`).join(' ')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                      该日期没有记忆
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;