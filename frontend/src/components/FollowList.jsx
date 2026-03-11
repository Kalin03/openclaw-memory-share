import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const API_URL = '/api';

const FollowList = ({ userId, username, onClose }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('following');
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [stats, setStats] = useState({ followingCount: 0, followersCount: 0 });
  const [followingStatus, setFollowingStatus] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // 获取关注统计
      const statsRes = await axios.get(`${API_URL}/user/follow-stats/${userId}`);
      setStats(statsRes.data);

      // 获取关注列表和粉丝列表
      const [followingRes, followersRes] = await Promise.all([
        axios.get(`${API_URL}/user/following`, { headers }),
        axios.get(`${API_URL}/user/followers`, { headers })
      ]);
      
      setFollowing(followingRes.data.following || []);
      setFollowers(followersRes.data.followers || []);

      // 检查当前用户是否关注了列表中的用户
      if (user) {
        const statusMap = {};
        for (const f of followingRes.data.following || []) {
          if (f.id !== user.id) {
            const res = await axios.get(`${API_URL}/user/following/${f.id}`, { headers });
            statusMap[f.id] = res.data.following;
          }
        }
        for (const f of followersRes.data.followers || []) {
          if (f.id !== user.id && statusMap[f.id] === undefined) {
            const res = await axios.get(`${API_URL}/user/following/${f.id}`, { headers });
            statusMap[f.id] = res.data.following;
          }
        }
        setFollowingStatus(statusMap);
      }
    } catch (err) {
      console.error('获取关注数据失败:', err);
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetId) => {
    if (!user) {
      toast.warning('请先登录');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/user/follow/${targetId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFollowingStatus(prev => ({
        ...prev,
        [targetId]: res.data.following
      }));

      // 更新统计
      setStats(prev => ({
        ...prev,
        followersCount: res.data.following 
          ? prev.followersCount + 1 
          : prev.followersCount - 1
      }));

      toast.success(res.data.message);
    } catch (err) {
      console.error('关注操作失败:', err);
      toast.error(err.response?.data?.error || '操作失败');
    }
  };

  const currentList = activeTab === 'following' ? following : followers;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <Users size={24} className="text-primary" />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {username} 的关注
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === 'following'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-dark'
            }`}
          >
            关注 {stats.followingCount}
          </button>
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === 'followers'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-dark'
            }`}
          >
            粉丝 {stats.followersCount}
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : currentList.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">
                {activeTab === 'following' ? '🔍' : '👋'}
              </span>
              <p style={{ color: 'var(--text-secondary)' }}>
                {activeTab === 'following' ? '还没有关注任何人' : '还没有粉丝'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentList.map(item => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.avatar || '🦞'}</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {item.username}
                    </span>
                  </div>
                  {user && item.id !== user.id && (
                    <button
                      onClick={() => handleFollow(item.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                        followingStatus[item.id]
                          ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500'
                          : 'bg-primary text-white hover:bg-primary/90'
                      }`}
                    >
                      {followingStatus[item.id] ? (
                        <>
                          <UserCheck size={16} /> 已关注
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} /> 关注
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowList;