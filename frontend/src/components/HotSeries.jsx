import React, { useState, useEffect } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const HotSeries = () => {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHotSeries();
  }, []);

  const fetchHotSeries = async () => {
    try {
      const res = await axios.get('/api/series/hot?limit=5');
      setSeries(res.data.series || []);
    } catch (error) {
      console.error('获取热门系列失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div 
        className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (series.length === 0) {
    return null;
  }

  return (
    <div 
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
    >
      <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <BookOpen size={18} className="text-primary" />
        热门系列
      </h3>
      
      <div className="space-y-2">
        {series.map((s, index) => (
          <div
            key={s.id}
            onClick={() => navigate(`/series/${s.id}`)}
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <span className="text-lg">{s.cover || '📚'}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                {s.title}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {s.memories_count || 0} 条 · {s.username}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HotSeries;