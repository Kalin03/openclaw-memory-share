import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, Star, Zap } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const UserLevelBadge = ({ level, size = 'md' }) => {
  const getLevelColor = (lvl) => {
    if (lvl >= 10) return 'from-yellow-400 to-orange-500';
    if (lvl >= 7) return 'from-purple-400 to-pink-500';
    if (lvl >= 5) return 'from-blue-400 to-indigo-500';
    if (lvl >= 3) return 'from-green-400 to-teal-500';
    return 'from-gray-400 to-gray-500';
  };

  const getLevelIcon = (lvl) => {
    if (lvl >= 10) return '👑';
    if (lvl >= 7) return '💎';
    if (lvl >= 5) return '⭐';
    if (lvl >= 3) return '🌟';
    return '💫';
  };

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-lg'
  };

  return (
    <div 
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-r ${getLevelColor(level)} ${sizeClasses[size]} text-white font-bold shadow-md`}
      title={`Lv.${level}`}
    >
      <span className="mr-0.5">{getLevelIcon(level)}</span>
      {level}
    </div>
  );
};

const UserLevelProgress = ({ userId }) => {
  const [levelInfo, setLevelInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLevelInfo();
  }, [userId]);

  const fetchLevelInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await axios.get(`${API_URL}/user/level`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLevelInfo(res.data);
    } catch (err) {
      console.error('获取等级信息失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !levelInfo) {
    return null;
  }

  return (
    <div 
      className="p-4 rounded-lg"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award size={20} className="text-primary" />
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
            等级进度
          </span>
        </div>
        <UserLevelBadge level={levelInfo.level} />
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div 
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <div 
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
            style={{ width: `${levelInfo.progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span style={{ color: 'var(--text-secondary)' }}>
          {levelInfo.points.toLocaleString()} 积分
        </span>
        <span style={{ color: 'var(--text-tertiary)' }}>
          距离 Lv.{levelInfo.level + 1} 还需 {levelInfo.pointsToNext.toLocaleString()} 分
        </span>
      </div>

      {/* Points breakdown hint */}
      <div 
        className="mt-3 pt-3 text-xs"
        style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-tertiary)' }}
      >
        <div className="flex flex-wrap gap-2">
          <span>📝 发布 +10</span>
          <span>❤️ 获赞 +5</span>
          <span>⭐ 获藏 +8</span>
          <span>💬 评论 +2</span>
          <span>📅 签到 +3</span>
        </div>
      </div>
    </div>
  );
};

const LevelLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get(`${API_URL}/leaderboard?limit=10`);
      setLeaderboard(res.data.leaderboard);
    } catch (err) {
      console.error('获取排行榜失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div 
      className="rounded-lg"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
    >
      <div className="flex items-center gap-2 p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <TrendingUp size={20} className="text-primary" />
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          积分排行榜
        </span>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
        {leaderboard.map((user, index) => (
          <div 
            key={user.id}
            className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-3">
              <span 
                className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold ${
                  index === 0 ? 'bg-yellow-400 text-white' :
                  index === 1 ? 'bg-gray-300 text-white' :
                  index === 2 ? 'bg-orange-400 text-white' :
                  'bg-gray-100 text-gray-600'
                }`}
              >
                {index + 1}
              </span>
              <span className="text-xl">{user.avatar || '🦞'}</span>
              <span style={{ color: 'var(--text-primary)' }}>{user.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <UserLevelBadge level={user.level} size="sm" />
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {user.points.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { UserLevelBadge, UserLevelProgress, LevelLeaderboard };
export default UserLevelBadge;