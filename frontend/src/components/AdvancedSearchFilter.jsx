import React, { useState, useEffect } from 'react';
import { Filter, X, Calendar, Tag, User, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const AdvancedSearchFilter = ({ filters, onFilterChange, onReset }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    startDate: '',
    endDate: '',
    tags: '',
    author: '',
    sort: 'relevance'
  });
  const [popularTags, setPopularTags] = useState([]);
  const [suggestedAuthors, setSuggestedAuthors] = useState([]);

  // 加载热门标签
  useEffect(() => {
    const fetchPopularTags = async () => {
      try {
        const res = await axios.get(`${API_URL}/tags/popular?limit=10`);
        setPopularTags(res.data.tags || []);
      } catch (err) {
        console.error('获取热门标签失败:', err);
      }
    };
    fetchPopularTags();
  }, []);

  // 同步外部 filters
  useEffect(() => {
    setLocalFilters({
      startDate: filters.startDate || '',
      endDate: filters.endDate || '',
      tags: filters.tags || '',
      author: filters.author || '',
      sort: filters.sort || 'relevance'
    });
  }, [filters]);

  const handleInputChange = (field, value) => {
    const newFilters = { ...localFilters, [field]: value };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      startDate: '',
      endDate: '',
      tags: '',
      author: '',
      sort: 'relevance'
    };
    setLocalFilters(resetFilters);
    onReset();
  };

  const handleTagClick = (tag) => {
    const currentTags = localFilters.tags ? localFilters.tags.split(',').map(t => t.trim()) : [];
    if (!currentTags.includes(tag)) {
      const newTags = [...currentTags, tag].join(', ');
      handleInputChange('tags', newTags);
    }
  };

  const sortOptions = [
    { value: 'relevance', label: '相关度优先' },
    { value: 'likes', label: '点赞最多' },
    { value: 'comments', label: '评论最多' },
    { value: 'oldest', label: '时间最早' }
  ];

  const hasActiveFilters = localFilters.startDate || localFilters.endDate || localFilters.tags || localFilters.author || localFilters.sort !== 'relevance';

  return (
    <div className="mb-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:opacity-80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter size={18} style={{ color: 'var(--text-secondary)' }} />
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>高级筛选</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-primary text-white">
              已启用
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp size={18} style={{ color: 'var(--text-secondary)' }} />
        ) : (
          <ChevronDown size={18} style={{ color: 'var(--text-secondary)' }} />
        )}
      </button>

      {/* Filter Panel */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {/* 时间范围 */}
            <div>
              <label className="flex items-center gap-1 text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                <Calendar size={14} />
                开始日期
              </label>
              <input
                type="date"
                value={localFilters.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                <Calendar size={14} />
                结束日期
              </label>
              <input
                type="date"
                value={localFilters.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* 标签筛选 */}
            <div>
              <label className="flex items-center gap-1 text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                <Tag size={14} />
                标签（逗号分隔）
              </label>
              <input
                type="text"
                placeholder="如：技术, 生活"
                value={localFilters.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              />
              {/* 热门标签快捷选择 */}
              {popularTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {popularTags.slice(0, 5).map(tag => (
                    <button
                      key={tag.name}
                      onClick={() => handleTagClick(tag.name)}
                      className="px-2 py-0.5 text-xs rounded-full border hover:opacity-80 transition-colors"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                    >
                      #{tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 作者筛选 */}
            <div>
              <label className="flex items-center gap-1 text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                <User size={14} />
                作者
              </label>
              <input
                type="text"
                placeholder="用户名"
                value={localFilters.author}
                onChange={(e) => handleInputChange('author', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {/* 排序方式 */}
          <div className="mt-4">
            <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
              排序方式
            </label>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleInputChange('sort', option.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    localFilters.sort === option.value
                      ? 'bg-primary text-white border-primary'
                      : 'hover:opacity-80'
                  }`}
                  style={localFilters.sort !== option.value ? { 
                    backgroundColor: 'var(--bg-primary)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  } : {}}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg hover:opacity-80 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <RotateCcw size={14} />
              重置筛选
            </button>
            <button
              onClick={applyFilters}
              className="btn-primary px-4 py-1.5 text-sm"
            >
              应用筛选
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && !isExpanded && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {localFilters.startDate && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              开始: {localFilters.startDate}
            </span>
          )}
          {localFilters.endDate && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              结束: {localFilters.endDate}
            </span>
          )}
          {localFilters.tags && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              标签: {localFilters.tags}
            </span>
          )}
          {localFilters.author && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              作者: {localFilters.author}
            </span>
          )}
          {localFilters.sort !== 'relevance' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              排序: {sortOptions.find(o => o.value === localFilters.sort)?.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedSearchFilter;