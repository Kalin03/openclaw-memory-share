import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Tag, Clock, Eye, Heart, Bookmark, MessageCircle, FolderOpen, Layers, BarChart3, Calendar } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const AnalyticsDashboard = ({ onClose }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [activeChart, setActiveChart] = useState('trend');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/user/analytics?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(res.data);
    } catch (error) {
      console.error('获取分析数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMaxValue = (data, key) => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map(d => d[key])) || 1;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="rounded-xl p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-center" style={{ color: 'var(--text-secondary)' }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="rounded-xl p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>无法加载数据</p>
          <button onClick={onClose} className="mt-4 btn-primary w-full">关闭</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <BarChart3 size={24} className="text-primary" />
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>数据统计仪表板</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Period Selector */}
        <div className="px-6 py-3 border-b flex gap-2" style={{ borderColor: 'var(--border-color)' }}>
          {[
            { value: 'week', label: '近7天' },
            { value: 'month', label: '近30天' },
            { value: 'year', label: '近一年' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === opt.value ? 'bg-primary text-white' : 'hover:opacity-80'
              }`}
              style={period !== opt.value ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : {}}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} className="text-primary" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>总记忆</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{analytics.contentStats.total}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>本月 +{analytics.recentActivity.monthly}</p>
            </div>

            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Eye size={18} className="text-blue-500" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>总阅读</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{analytics.contentStats.totalViews}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>平均 {analytics.contentStats.avgViews}/篇</p>
            </div>

            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Heart size={18} className="text-red-500" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>获赞</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{analytics.engagement.likesReceived}</p>
            </div>

            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Bookmark size={18} className="text-yellow-500" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>被收藏</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{analytics.engagement.bookmarksReceived}</p>
            </div>
          </div>

          {/* Chart Tabs */}
          <div className="flex gap-2 mb-4">
            {[
              { value: 'trend', label: '创作趋势', icon: TrendingUp },
              { value: 'tags', label: '热门标签', icon: Tag },
              { value: 'time', label: '活跃时段', icon: Clock }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setActiveChart(opt.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeChart === opt.value ? 'bg-primary text-white' : 'hover:opacity-80'
                }`}
                style={activeChart !== opt.value ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : {}}
              >
                <opt.icon size={16} />
                {opt.label}
              </button>
            ))}
          </div>

          {/* Charts */}
          <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {/* Memory Trend Chart */}
            {activeChart === 'trend' && (
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  记忆创作趋势
                </h3>
                {analytics.memoryTrend.length > 0 ? (
                  <div className="h-48 flex items-end gap-1">
                    {analytics.memoryTrend.map((item, index) => {
                      const maxCount = getMaxValue(analytics.memoryTrend, 'count');
                      const height = (item.count / maxCount) * 100;
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center group">
                          <div 
                            className="w-full bg-primary/80 rounded-t transition-all group-hover:bg-primary"
                            style={{ height: `${Math.max(height, 5)}%` }}
                            title={`${item.date}: ${item.count} 条`}
                          ></div>
                          {index % Math.ceil(analytics.memoryTrend.length / 7) === 0 && (
                            <span className="text-xs mt-1 truncate w-full text-center" style={{ color: 'var(--text-secondary)' }}>
                              {formatDate(item.date)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>暂无数据</p>
                )}
              </div>
            )}

            {/* Top Tags Chart */}
            {activeChart === 'tags' && (
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  热门标签 TOP 10
                </h3>
                {analytics.topTags.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.topTags.map((tag, index) => {
                      const maxCount = analytics.topTags[0]?.count || 1;
                      const width = (tag.count / maxCount) * 100;
                      return (
                        <div key={index} className="flex items-center gap-3">
                          <span className="text-sm font-medium w-24 truncate" style={{ color: 'var(--text-primary)' }}>
                            #{tag.name}
                          </span>
                          <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                            <div 
                              className="h-full bg-primary/80 rounded-full transition-all"
                              style={{ width: `${width}%` }}
                            ></div>
                          </div>
                          <span className="text-sm w-8 text-right" style={{ color: 'var(--text-secondary)' }}>
                            {tag.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>暂无标签数据</p>
                )}
              </div>
            )}

            {/* Hourly Activity Chart */}
            {activeChart === 'time' && (
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  创作活跃时段
                </h3>
                {analytics.hourlyActivity.length > 0 ? (
                  <div className="h-48 flex items-end gap-1">
                    {[...Array(24)].map((_, hour) => {
                      const data = analytics.hourlyActivity.find(d => d.hour === hour);
                      const count = data?.count || 0;
                      const maxCount = getMaxValue(analytics.hourlyActivity, 'count');
                      const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      return (
                        <div key={hour} className="flex-1 flex flex-col items-center group">
                          <div 
                            className={`w-full rounded-t transition-all ${count > 0 ? 'bg-primary/80 group-hover:bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                            style={{ height: `${Math.max(height, 2)}%` }}
                            title={`${hour}:00 - ${count} 条`}
                          ></div>
                          {hour % 6 === 0 && (
                            <span className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                              {hour}:00
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>暂无数据</p>
                )}
              </div>
            )}
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="rounded-lg p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <MessageCircle size={20} className="text-green-500" />
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>收到评论</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{analytics.engagement.commentsReceived}</p>
              </div>
            </div>

            <div className="rounded-lg p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <FolderOpen size={20} className="text-purple-500" />
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>收藏夹</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{analytics.collections}</p>
              </div>
            </div>

            <div className="rounded-lg p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <Layers size={20} className="text-indigo-500" />
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>系列</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{analytics.series}</p>
              </div>
            </div>

            <div className="rounded-lg p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <Calendar size={20} className="text-orange-500" />
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>本周新增</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{analytics.recentActivity.weekly}</p>
              </div>
            </div>
          </div>

          {/* Visibility Stats */}
          <div className="mt-6 rounded-lg p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>可见性分布</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex h-4 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  {analytics.contentStats.total > 0 && (
                    <>
                      <div 
                        className="bg-green-500" 
                        style={{ width: `${(analytics.contentStats.public / analytics.contentStats.total) * 100}%` }}
                      ></div>
                      <div 
                        className="bg-gray-400" 
                        style={{ width: `${(analytics.contentStats.private / analytics.contentStats.total) * 100}%` }}
                      ></div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  公开 {analytics.contentStats.public} 条
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  私密 {analytics.contentStats.private} 条
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;