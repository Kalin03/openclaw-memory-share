import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Flame, Trophy, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const CheckinCard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCheckinStatus();
    }
  }, [user]);

  const fetchCheckinStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/user/checkin', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCheckinStatus(res.data);
    } catch (error) {
      console.error('获取签到状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async () => {
    if (!user || checkingIn) return;

    setCheckingIn(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/user/checkin', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showToast('🎉 签到成功！', 'success');
      setCheckinStatus(prev => ({
        ...prev,
        checkedInToday: true,
        currentStreak: res.data.checkin.streak,
        totalCheckins: res.data.checkin.totalCheckins
      }));
    } catch (error) {
      if (error.response?.data?.alreadyCheckedIn) {
        showToast('今天已经签到过了', 'info');
      } else {
        showToast(error.response?.data?.error || '签到失败', 'error');
      }
    } finally {
      setCheckingIn(false);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="h-4 bg-gray-300 rounded w-24 mb-3"></div>
        <div className="h-8 bg-gray-300 rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <Calendar size={18} className="text-primary" />
        每日签到
      </h3>
      
      {/* 签到按钮 */}
      <button
        onClick={handleCheckin}
        disabled={checkinStatus?.checkedInToday || checkingIn}
        className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
          checkinStatus?.checkedInToday
            ? 'bg-green-100 text-green-600 cursor-default'
            : 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:scale-[1.02]'
        }`}
        style={checkinStatus?.checkedInToday ? { backgroundColor: 'var(--bg-tertiary)' } : {}}
      >
        {checkinStatus?.checkedInToday ? (
          <>
            <CheckCircle size={20} />
            今日已签到
          </>
        ) : checkingIn ? (
          '签到中...'
        ) : (
          <>
            <Calendar size={20} />
            立即签到
          </>
        )}
      </button>

      {/* 统计数据 */}
      {checkinStatus && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
              <Flame size={14} />
              <span className="text-xs">连续</span>
            </div>
            <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              {checkinStatus.currentStreak}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>天</div>
          </div>
          
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
              <Trophy size={14} />
              <span className="text-xs">最长</span>
            </div>
            <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              {checkinStatus.maxStreak}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>天</div>
          </div>
          
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
              <Calendar size={14} />
              <span className="text-xs">累计</span>
            </div>
            <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              {checkinStatus.totalCheckins}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>天</div>
          </div>
        </div>
      )}

      {/* 鼓励语 */}
      {checkinStatus && !checkinStatus.checkedInToday && checkinStatus.currentStreak > 0 && (
        <p className="text-xs text-center mt-3" style={{ color: 'var(--text-secondary)' }}>
          🔥 已连续签到 {checkinStatus.currentStreak} 天，继续保持！
        </p>
      )}
    </div>
  );
};

export default CheckinCard;