import React, { useState, useEffect } from 'react';
import { X, Trophy, Award, Star, Lock, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const BadgeShowcase = ({ onClose }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    if (user) {
      fetchBadges();
    }
  }, [user]);

  const fetchBadges = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/user/badges', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEarnedBadges(res.data.earned);
      setAllBadges(res.data.all);
      setTotalPoints(res.data.totalPoints);
    } catch (error) {
      console.error('获取徽章失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckBadges = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/user/badges/check', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.newBadges.length > 0) {
        toast.success(res.data.message);
        fetchBadges();
      } else {
        toast.info('暂无新徽章');
      }
    } catch (error) {
      console.error('检查徽章失败:', error);
    }
  };

  const categories = [
    { id: 'all', name: '全部', icon: Trophy },
    { id: 'checkin', name: '签到', icon: Star },
    { id: 'creation', name: '创作', icon: Award },
    { id: 'interaction', name: '互动', icon: Star },
    { id: 'social', name: '社交', icon: Star },
    { id: 'comment', name: '评论', icon: Star },
  ];

  const earnedIds = earnedBadges.map(b => b.id);

  const filteredBadges = activeCategory === 'all' 
    ? allBadges 
    : allBadges.filter(b => b.category === activeCategory);

  const earnedCount = allBadges.filter(b => earnedIds.includes(b.id)).length;

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <Trophy className="text-yellow-500" size={24} />
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>徽章成就</h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                已获得 {earnedCount}/{allBadges.length} 个徽章 · {totalPoints} 积分
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="p-4 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">{earnedCount}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>已获得</div>
              </div>
              <div className="w-px h-8" style={{ backgroundColor: 'var(--border-color)' }}></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{allBadges.length}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>总徽章</div>
              </div>
              <div className="w-px h-8" style={{ backgroundColor: 'var(--border-color)' }}></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{totalPoints}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>积分</div>
              </div>
            </div>
            <button
              onClick={handleCheckBadges}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              检查新徽章
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-4 py-2 border-b shrink-0 flex gap-2 overflow-x-auto" style={{ borderColor: 'var(--border-color)' }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.id 
                  ? 'bg-primary text-white' 
                  : ''
              }`}
              style={activeCategory !== cat.id ? { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : {}}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Badge Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              加载中...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredBadges.map(badge => {
                const isEarned = earnedIds.includes(badge.id);
                const earnedInfo = earnedBadges.find(b => b.id === badge.id);
                
                return (
                  <div
                    key={badge.id}
                    className={`relative p-4 rounded-xl transition-all ${
                      isEarned ? 'ring-2 ring-yellow-500/50' : 'opacity-60'
                    }`}
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    {/* Earned indicator */}
                    {isEarned && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle size={16} className="text-green-500" />
                      </div>
                    )}
                    
                    {/* Badge icon */}
                    <div className={`text-4xl text-center mb-2 ${isEarned ? '' : 'grayscale'}`}>
                      {badge.icon}
                    </div>
                    
                    {/* Badge name */}
                    <h3 className="font-bold text-sm text-center mb-1" style={{ color: 'var(--text-primary)' }}>
                      {badge.name}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-xs text-center mb-2" style={{ color: 'var(--text-secondary)' }}>
                      {badge.description}
                    </p>
                    
                    {/* Points */}
                    <div className="text-center">
                      <span className="text-xs font-medium text-yellow-500">
                        +{badge.points} 积分
                      </span>
                    </div>
                    
                    {/* Earned date */}
                    {isEarned && earnedInfo && (
                      <div className="text-xs text-center mt-2" style={{ color: 'var(--text-secondary)' }}>
                        获得于 {new Date(earnedInfo.earned_at).toLocaleDateString('zh-CN')}
                      </div>
                    )}
                    
                    {/* Lock overlay for unearned */}
                    {!isEarned && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                        <Lock size={24} style={{ color: 'var(--text-secondary)' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t text-center shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            💡 发布记忆、签到、互动都可以获得徽章，快来收集吧！
          </p>
        </div>
      </div>
    </div>
  );
};

export default BadgeShowcase;