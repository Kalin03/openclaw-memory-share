import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Heart, 
  Bookmark,
  ChevronRight,
  RefreshCw,
  Filter,
  X
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import MemoryCard from './MemoryCard';

/**
 * 内容推荐引擎组件
 * 基于用户行为和偏好推荐内容
 */
const RecommendationEngine = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('for-you'); // for-you, trending, recent, similar
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchRecommendations();
    }
  }, [isOpen, activeTab, refreshKey]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/recommendations?type=${activeTab}`);
      setRecommendations(res.data.recommendations || []);
    } catch (err) {
      console.error('获取推荐失败:', err);
      // 使用模拟数据
      setRecommendations(generateMockRecommendations());
    } finally {
      setLoading(false);
    }
  };

  const generateMockRecommendations = () => {
    const mockData = [
      { id: 1, title: 'React 18 新特性详解', content: 'React 18 带来了并发渲染、自动批处理、Suspense改进等重要特性...', username: '技术达人', likes_count: 234, created_at: '2026-03-15', tags: 'React,前端', reason: '基于你的阅读历史' },
      { id: 2, title: 'TypeScript 类型体操入门', content: '掌握 TypeScript 高级类型，让类型系统为你服务...', username: '前端小王', likes_count: 189, created_at: '2026-03-14', tags: 'TypeScript', reason: '你关注的标签' },
      { id: 3, title: 'Node.js 性能优化实践', content: '从内存管理到异步优化，全面提升 Node.js 应用性能...', username: '后端专家', likes_count: 156, created_at: '2026-03-13', tags: 'Node.js,性能', reason: '热门推荐' },
      { id: 4, title: 'CSS Grid 完全指南', content: '从入门到精通，掌握 CSS Grid 布局的所有技巧...', username: 'CSS大师', likes_count: 142, created_at: '2026-03-12', tags: 'CSS,布局', reason: '相似内容推荐' },
      { id: 5, title: 'Git 工作流最佳实践', content: '团队协作中 Git 分支策略和提交规范的最佳实践...', username: 'DevOps工程师', likes_count: 128, created_at: '2026-03-11', tags: 'Git,协作', reason: '高评分内容' }
    ];
    return mockData;
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const tabs = [
    { id: 'for-you', label: '为你推荐', icon: Sparkles },
    { id: 'trending', label: '热门趋势', icon: TrendingUp },
    { id: 'recent', label: '最新发布', icon: Clock },
    { id: 'similar', label: '相似内容', icon: Bookmark }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[85vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-lg font-semibold">智能推荐</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
              title="刷新推荐"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 标签栏 */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors
                ${activeTab === tab.id
                  ? 'text-pink-600 dark:text-pink-400 border-b-2 border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">暂无推荐内容</p>
              <p className="text-sm text-gray-400 mt-1">多浏览和互动可以获得更精准的推荐</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((item, index) => (
                <div
                  key={item.id || index}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => {
                    window.location.href = `/memory/${item.id}`;
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                        {item.content}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{item.username}</span>
                        <span>·</span>
                        <span>{new Date(item.created_at).toLocaleDateString('zh-CN')}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {item.likes_count}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                  {item.reason && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-full text-xs">
                        <Sparkles className="w-3 h-3" />
                        {item.reason}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            推荐基于你的阅读历史、收藏和互动行为
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecommendationEngine;