import React, { useState, useEffect } from 'react';
import { TrendingUp, Eye, Heart, Bookmark, MessageCircle, Users, Calendar, Award, BarChart3, ArrowUp, ArrowDown } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const CreatorDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await axios.get(`${API_URL}/user/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error('获取创作者数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const StatCard = ({ icon: Icon, label, value, change, color }) => (
    <div 
      className="p-4 rounded-xl"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon size={20} className={color} />
        {change !== undefined && (
          <span className={`flex items-center text-xs ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {change >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={24} className="text-primary" />
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            创作者中心
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {['week', 'month', 'year'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                period === p ? 'bg-primary text-white' : ''
              }`}
              style={period !== p ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : {}}
            >
              {p === 'week' ? '本周' : p === 'month' ? '本月' : '本年'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Eye}
          label="总阅读量"
          value={stats.totalViews || 0}
          change={stats.viewsChange}
          color="text-blue-500"
        />
        <StatCard
          icon={Heart}
          label="总点赞数"
          value={stats.totalLikes || 0}
          change={stats.likesChange}
          color="text-red-500"
        />
        <StatCard
          icon={Bookmark}
          label="总收藏数"
          value={stats.totalBookmarks || 0}
          change={stats.bookmarksChange}
          color="text-yellow-500"
        />
        <StatCard
          icon={Users}
          label="粉丝数"
          value={stats.followersCount || 0}
          change={stats.followersChange}
          color="text-purple-500"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={MessageCircle}
          label="评论数"
          value={stats.totalComments || 0}
          color="text-green-500"
        />
        <StatCard
          icon={Calendar}
          label="发布记忆"
          value={stats.memoriesCount || 0}
          color="text-orange-500"
        />
        <StatCard
          icon={Award}
          label="积分"
          value={stats.points || 0}
          color="text-primary"
        />
        <StatCard
          icon={TrendingUp}
          label="等级"
          value={`Lv.${stats.level || 1}`}
          color="text-indigo-500"
        />
      </div>

      {/* Quick Tips */}
      <div 
        className="p-4 rounded-xl"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
      >
        <h3 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          💡 创作建议
        </h3>
        <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {stats.memoriesCount < 10 && (
            <li>• 发布更多记忆，增加内容曝光机会</li>
          )}
          {stats.totalViews < 100 && (
            <li>• 添加合适的标签，让更多人发现你的内容</li>
          )}
          {stats.followersCount < 10 && (
            <li>• 关注其他创作者，建立社交连接</li>
          )}
          {stats.memoriesCount >= 10 && stats.totalViews >= 100 && (
            <li>• 保持创作频率，定期发布优质内容</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default CreatorDashboard;