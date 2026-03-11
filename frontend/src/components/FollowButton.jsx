import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const API_URL = '/api';

const FollowButton = ({ targetUserId, onFollowChange }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (user && targetUserId && user.id !== targetUserId) {
      checkFollowStatus();
    } else {
      setChecking(false);
    }
  }, [user, targetUserId]);

  const checkFollowStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/user/following/${targetUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsFollowing(res.data.following);
    } catch (err) {
      console.error('检查关注状态失败:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      toast.warning('请先登录');
      return;
    }

    if (user.id === targetUserId) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/user/follow/${targetUserId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setIsFollowing(res.data.following);
      toast.success(res.data.message);
      
      if (onFollowChange) {
        onFollowChange(res.data.following);
      }
    } catch (err) {
      console.error('关注操作失败:', err);
      toast.error(err.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 不显示自己的关注按钮
  if (!user || user.id === targetUserId || checking) {
    return null;
  }

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
        isFollowing
          ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 border border-gray-200'
          : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
      }`}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck size={16} /> 已关注
        </>
      ) : (
        <>
          <UserPlus size={16} /> 关注
        </>
      )}
    </button>
  );
};

export default FollowButton;