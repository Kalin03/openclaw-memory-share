import { useState, useEffect } from 'react';

function TagFollowButton({ tag, onFollowChange }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const normalizedTag = tag?.trim().toLowerCase();

  useEffect(() => {
    if (!normalizedTag) return;

    const checkFollowing = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch(`/api/tags/${normalizedTag}/following`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setFollowing(data.following);
      } catch (err) {
        console.error('检查标签关注状态失败:', err);
      }
    };

    checkFollowing();
  }, [normalizedTag]);

  const handleToggle = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('请先登录');
      return;
    }

    setLoading(true);
    try {
      const method = following ? 'DELETE' : 'POST';
      const res = await fetch(`/api/tags/${normalizedTag}/follow`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '操作失败');
      }

      setFollowing(!following);
      if (onFollowChange) {
        onFollowChange(normalizedTag, !following);
      }
    } catch (err) {
      console.error('操作失败:', err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!normalizedTag) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`
        px-3 py-1 text-xs rounded-full transition-all duration-200
        ${following
          ? 'bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {loading ? '...' : (following ? '已关注' : '+ 关注')}
    </button>
  );
}

export default TagFollowButton;