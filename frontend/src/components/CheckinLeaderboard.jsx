import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, Medal, Award, Loader2 } from 'lucide-react';

const CheckinLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get('/api/checkin/leaderboard?limit=10');
      setLeaderboard(res.data.leaderboard);
    } catch (error) {
      console.error('获取签到排行榜失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index) => {
    switch (index) {
      case 0:
        return <Trophy className="text-yellow-500" size={18} />;
      case 1:
        return <Medal className="text-gray-400" size={18} />;
      case 2:
        return <Award className="text-amber-600" size={18} />;
      default:
        return <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{index + 1}</span>;
    }
  };

  const getRankBg = (index) => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200';
      case 1:
        return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200';
      case 2:
        return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <Trophy size={18} className="text-yellow-500" />
        签到排行榜
      </h3>
      
      <div className="space-y-2">
        {leaderboard.map((item, index) => (
          <div
            key={item.user_id}
            className={`flex items-center gap-3 p-2 rounded-lg border ${getRankBg(index)}`}
            style={!getRankBg(index) ? { backgroundColor: 'var(--bg-tertiary)' } : {}}
          >
            <div className="w-6 flex items-center justify-center">
              {getRankIcon(index)}
            </div>
            
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-lg">{item.avatar || '🦞'}</span>
              <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {item.username}
              </span>
            </div>
            
            <div className="flex items-center gap-1 text-orange-500">
              <span className="font-bold">{item.streak}</span>
              <span className="text-xs">天</span>
            </div>
          </div>
        ))}
      </div>
      
      {leaderboard.length > 0 && (
        <p className="text-xs text-center mt-3" style={{ color: 'var(--text-secondary)' }}>
          按连续签到天数排名
        </p>
      )}
    </div>
  );
};

export default CheckinLeaderboard;