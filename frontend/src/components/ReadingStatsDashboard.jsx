import React, { useState, useEffect } from 'react';
import { 
  X, 
  Eye, 
  Clock, 
  TrendingUp, 
  BarChart3, 
  Calendar,
  BookOpen,
  Heart,
  MessageCircle,
  Bookmark,
  Users,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

/**
 * 阅读统计仪表板组件
 * 展示用户的阅读数据统计和分析
 */
const ReadingStatsDashboard = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week'); // week, month, year

  useEffect(() => {
    if (isOpen && user) {
      fetchStats();
    }
  }, [isOpen, user, timeRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/users/${user.id}/reading-stats?range=${timeRange}`);
      setStats(res.data);
    } catch (err) {
      console.error('获取统计失败:', err);
      // 使用模拟数据
      setStats(generateMockStats());
    } finally {
      setLoading(false);
    }
  };

  // 生成模拟数据
  const generateMockStats = () => {
    return {
      overview: {
        totalViews: 1250,
        totalReadTime: 3600, // 秒
        avgReadTime: 180,
        totalMemories: 45,
        completionRate: 78
      },
      trends: {
        viewsTrend: 12.5,
        readTimeTrend: 8.3,
        completionTrend: -2.1
      },
      dailyData: [
        { date: '03-10', views: 45, readTime: 120 },
        { date: '03-11', views: 62, readTime: 180 },
        { date: '03-12', views: 38, readTime: 90 },
        { date: '03-13', views: 55, readTime: 150 },
        { date: '03-14', views: 78, readTime: 210 },
        { date: '03-15', views: 92, readTime: 280 },
        { date: '03-16', views: 65, readTime: 175 }
      ],
      topContent: [
        { id: 1, title: 'React 性能优化指南', views: 234, avgTime: 320 },
        { id: 2, title: 'TypeScript 类型体操', views: 198, avgTime: 280 },
        { id: 3, title: 'CSS Grid 完全指南', views: 156, avgTime: 240 },
        { id: 4, title: 'Node.js 最佳实践', views: 134, avgTime: 200 },
        { id: 5, title: 'Git 工作流详解', views: 112, avgTime: 180 }
      ],
      readingDistribution: {
        morning: 25, // 6-12
        afternoon: 35, // 12-18
        evening: 30, // 18-24
        night: 10 // 0-6
      }
    };
  };

  // 格式化时间
  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${mins}分钟`;
  };

  // 趋势指示器
  const TrendIndicator = ({ value }) => {
    if (value > 0) {
      return (
        <span className="flex items-center gap-1 text-green-500 text-sm">
          <ArrowUp className="w-3 h-3" />
          +{value}%
        </span>
      );
    } else if (value < 0) {
      return (
        <span className="flex items-center gap-1 text-red-500 text-sm">
          <ArrowDown className="w-3 h-3" />
          {value}%
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-gray-400 text-sm">
        <Minus className="w-3 h-3" />
        0%
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5" />
            <h2 className="text-lg font-semibold">阅读统计</h2>
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
                  className={`px-3 py-1 rounded text-sm transition-all
                    ${timeRange === t.value ? 'bg-white text-orange-600' : 'text-white hover:bg-white/20'}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : stats ? (
            <>
              {/* 概览卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">总阅读量</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.overview.totalViews.toLocaleString()}
                  </div>
                  <TrendIndicator value={stats.trends.viewsTrend} />
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">总阅读时长</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatTime(stats.overview.totalReadTime)}
                  </div>
                  <TrendIndicator value={stats.trends.readTimeTrend} />
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-sm">平均阅读</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatTime(stats.overview.avgReadTime)}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">完成率</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.overview.completionRate}%
                  </div>
                  <TrendIndicator value={stats.trends.completionTrend} />
                </div>
              </div>

              {/* 图表区域 */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* 每日趋势 */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    每日趋势
                  </h3>
                  <div className="h-48 flex items-end gap-2">
                    {stats.dailyData.map((day, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-gradient-to-t from-orange-500 to-amber-400 rounded-t transition-all"
                          style={{ 
                            height: `${(day.views / Math.max(...stats.dailyData.map(d => d.views))) * 150}px`,
                            minHeight: '8px'
                          }}
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {day.date}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 阅读时段分布 */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    阅读时段分布
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: '上午 (6-12)', value: stats.readingDistribution.morning, color: 'from-yellow-400 to-amber-500' },
                      { label: '下午 (12-18)', value: stats.readingDistribution.afternoon, color: 'from-orange-400 to-red-500' },
                      { label: '晚上 (18-24)', value: stats.readingDistribution.evening, color: 'from-purple-400 to-indigo-500' },
                      { label: '深夜 (0-6)', value: stats.readingDistribution.night, color: 'from-blue-400 to-cyan-500' }
                    ].map((slot, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">{slot.label}</span>
                          <span className="text-gray-900 dark:text-white font-medium">{slot.value}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${slot.color} rounded-full`}
                            style={{ width: `${slot.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 热门内容 */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  热门内容
                </h3>
                <div className="space-y-3">
                  {stats.topContent.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-600 rounded-lg">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold
                        ${i === 0 ? 'bg-yellow-100 text-yellow-600' : ''}
                        ${i === 1 ? 'bg-gray-200 text-gray-600' : ''}
                        ${i === 2 ? 'bg-orange-100 text-orange-600' : ''}
                        ${i > 2 ? 'bg-gray-100 text-gray-500' : ''}
                      `}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {item.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(item.avgTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              暂无统计数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReadingStatsDashboard;