import React, { useState, useEffect } from 'react';
import { Hash } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const TagCloud = ({ onTagClick }) => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPopularTags();
  }, []);

  const fetchPopularTags = async () => {
    try {
      const res = await axios.get(`${API_URL}/tags/popular?limit=15`);
      setTags(res.data.tags || []);
    } catch (error) {
      console.error('获取热门标签失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Hash size={18} className="text-primary" />
          热门标签
        </h3>
        <div className="flex flex-wrap gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton h-6 w-16 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  // 根据标签数量计算字体大小
  const getTagSize = (count, maxCount) => {
    const ratio = count / maxCount;
    if (ratio > 0.7) return 'text-lg font-bold';
    if (ratio > 0.4) return 'text-base font-medium';
    return 'text-sm';
  };

  // 根据标签数量计算颜色深浅
  const getTagColor = (count, maxCount) => {
    const ratio = count / maxCount;
    if (ratio > 0.7) return 'bg-primary/20 text-primary hover:bg-primary/30';
    if (ratio > 0.4) return 'bg-primary/10 text-primary/80 hover:bg-primary/20';
    return 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400';
  };

  const maxCount = tags[0]?.count || 1;

  return (
    <div className="card">
      <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <Hash size={18} className="text-primary" />
        热门标签
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <button
            key={index}
            onClick={() => onTagClick && onTagClick(tag.name)}
            className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${getTagSize(tag.count, maxCount)} ${getTagColor(tag.count, maxCount)}`}
            title={`${tag.count} 条记忆`}
          >
            #{tag.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TagCloud;