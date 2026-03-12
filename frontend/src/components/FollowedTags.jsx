import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import TagFollowButton from './TagFollowButton';
import MemoryCard from './MemoryCard';
import MemoryCardSkeleton from './MemoryCardSkeleton';

function FollowedTags({ onClose }) {
  const { user } = useAuth();
  const [tags, setTags] = useState([]);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('memories');

  useEffect(() => {
    if (user) {
      fetchTags();
      fetchMemories();
    }
  }, [user]);

  const fetchTags = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('/api/tags/followed', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTags(data);
    } catch (err) {
      console.error('获取关注标签失败:', err);
    }
  };

  const fetchMemories = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/tags/followed-memories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (err) {
      console.error('获取关注标签记忆失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowChange = (tag, isFollowing) => {
    if (!isFollowing) {
      setTags(prev => prev.filter(t => t.tag !== tag));
    }
    fetchMemories();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            🔖 关注标签
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b dark:border-gray-700">
          <button
            onClick={() => setActiveTab('memories')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'memories'
                ? 'text-orange-600 border-b-2 border-orange-500'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            相关记忆 {memories.length > 0 && `(${memories.length})`}
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'tags'
                ? 'text-orange-600 border-b-2 border-orange-500'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            已关注标签 {tags.length > 0 && `(${tags.length})`}
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {activeTab === 'memories' && (
            <>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <MemoryCardSkeleton key={i} />
                  ))}
                </div>
              ) : memories.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="text-4xl mb-2">📭</p>
                  <p>暂无相关记忆</p>
                  <p className="text-sm mt-1">关注感兴趣的标签，获取相关内容推荐</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {memories.map(memory => (
                    <div key={memory.id} className="relative">
                      <MemoryCard memory={memory} />
                      {memory.matched_tags && memory.matched_tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {memory.matched_tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 text-xs bg-orange-100 text-orange-600 rounded dark:bg-orange-900/30 dark:text-orange-400"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'tags' && (
            <>
              {tags.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="text-4xl mb-2">🏷️</p>
                  <p>还没有关注任何标签</p>
                  <p className="text-sm mt-1">点击记忆卡片上的标签可以关注</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {tags.map(item => (
                    <div
                      key={item.tag}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div>
                        <span className="text-gray-800 dark:text-white font-medium">
                          #{item.tag}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {item.memories_count || 0} 条记忆
                        </p>
                      </div>
                      <TagFollowButton
                        tag={item.tag}
                        onFollowChange={handleFollowChange}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default FollowedTags;