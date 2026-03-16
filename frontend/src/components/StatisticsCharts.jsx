import React, { useState, useEffect } from 'react';
import { 
  X, 
  BarChart3, 
  TrendingUp,
  Users,
  FileText,
  Eye,
  Heart,
  MessageCircle,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';

/**
 * 数据统计图表组件
 * 展示平台整体数据统计
 */
const StatisticsCharts = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week'); // week, month, year
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen, timeRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/admin/statistics?range=${timeRange}`);
      setStats(res.data);
    } catch (err) {
      console.error('获取统计数据失败:', err);
      // 使用模拟数据
      setStats({
        overview: {
          totalUsers: 1250,
          totalMemories: 8420,
          totalViews: 125000,
          totalLikes: 28500
        },
        growth: {
          usersGrowth: 12.5,
          memoriesGrowth: 8.3,
          viewsGrowth: 15.2,
          likesGrowth: 10.8
        },
        dailyData: generateDailyData(),
        topCategories: [
          { name: '技术', count: 2450, color: '#3B82F6' },
          { name: '生活', count: 1820, color: '#10B981' },
          { name: '学习', count: 1560, color: '#F59E0B' },
          { name: '工作', count: 1230, color: '#8B5CF6' },
          { name: '其他', count: 980, color: '#EC4899' }
        ],
        activeUsers: [
          { username: '技术达人', posts: 45, likes: 234 },
          { username: '生活记录者', posts: 38, likes: 189 },
          { username: '学习笔记', posts: 32, likes: 156 },
          { username: '工作分享', posts: 28, likes: 142 },
          { username: '日常随笔', posts: 25, likes: 128 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const generateDailyData = () => {
    const data = [];
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 12;
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        users: Math.floor(Math.random() * 50) + 10,
        memories: Math.floor(Math.random() * 100) + 30,
        views: Math.floor(Math.random() * 1000) + 200
      });
    }
    return data;
  };

  const maxValue = stats?.dailyData ? Math.max(...stats.dailyData.map(d => d.memories)) : 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5" />
            <h2 className="text-lg font-semibold">数据统计</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-white/20 rounded-lg p-1">
              {[
                { value: 'week', label: '周' },
                { value: 'month', label: '月' },
                { value: 'year', label: '年' }
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTimeRange(t.value)}
                  className={`px-3 py-1 rounded text-sm transition-colors
                    ${timeRange === t.value ? 'bg-white text-indigo-600' : 'text-white'}
                  `}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* 概览卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">总用户</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.overview.totalUsers.toLocaleString()}
                  </div>
                  <span className="text-xs text-green-600">+{stats.growth.usersGrowth}%</span>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">总记忆</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.overview.totalMemories.toLocaleString()}
                  </div>
                  <span className="text-xs text-green-600">+{stats.growth.memoriesGrowth}%</span>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">总浏览</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.overview.totalViews.toLocaleString()}
                  </div>
                  <span className="text-xs text-green-600">+{stats.growth.viewsGrowth}%</span>
                </div>

                <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 mb-2">
                    <Heart className="w-4 h-4" />
                    <span className="text-sm">总点赞</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.overview.totalLikes.toLocaleString()}
                  </div>
                  <span className="text-xs text-green-600">+{stats.growth.likesGrowth}%</span>
                </div>
              </div>

              {/* 图表区域 */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* 每日趋势 */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    记忆创建趋势
                  </h3>
                  <div className="h-48 flex items-end gap-1">
                    {stats.dailyData.map((day, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-gradient-to-t from-indigo-500 to-purple-400 rounded-t transition-all"
                          style={{ 
                            height: `${(day.memories / maxValue) * 150}px`,
                            minHeight: '4px'
                          }}
                        />
                        {i % Math.ceil(stats.dailyData.length / 7) === 0 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {day.date}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 分类统计 */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                    热门分类
                  </h3>
                  <div className="space-y-3">
                    {stats.topCategories.map((cat, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">{cat.name}</span>
                          <span className="text-gray-900 dark:text-white font-medium">{cat.count}</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full"
                            style={{ 
                              width: `${(cat.count / stats.topCategories[0].count) * 100}%`,
                              backgroundColor: cat.color
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 活跃用户 */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  活跃用户排行
                </h3>
                <div className="grid md:grid-cols-5 gap-3">
                  {stats.activeUsers.map((u, i) => (
                    <div key={i} className="bg-white dark:bg-gray-600 rounded-lg p-3 text-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold mx-auto mb-2">
                        {u.username.charAt(0)}
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{u.username}</p>
                      <div className="flex items-center justify-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{u.posts} 条</span>
                        <span>❤️ {u.likes}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default StatisticsCharts;