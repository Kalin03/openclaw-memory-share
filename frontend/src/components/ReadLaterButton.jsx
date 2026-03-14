import React, { useState, useEffect } from 'react';
import { Clock, Check } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const ReadLaterButton = ({ memoryId, size = 18, showLabel = false }) => {
  const [inReadLater, setInReadLater] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, [memoryId]);

  const checkStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/memories/${memoryId}/read-later`);
      setInReadLater(res.data.inReadLater);
    } catch (err) {
      // Ignore errors (user not logged in, etc.)
    }
  };

  const handleToggle = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (inReadLater) {
        await axios.delete(`${API_URL}/memories/${memoryId}/read-later`);
        setInReadLater(false);
      } else {
        await axios.post(`${API_URL}/memories/${memoryId}/read-later`);
        setInReadLater(true);
      }
    } catch (err) {
      console.error('操作失败:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-1.5 transition-colors ${
        inReadLater 
          ? 'text-primary' 
          : 'text-gray-500 hover:text-primary'
      }`}
      title={inReadLater ? '从稍后阅读移除' : '加入稍后阅读'}
    >
      {inReadLater ? (
        <Check size={size} className="text-primary" />
      ) : (
        <Clock size={size} />
      )}
      {showLabel && (
        <span className="text-sm font-medium">
          {inReadLater ? '已加入' : '稍后阅读'}
        </span>
      )}
    </button>
  );
};

export default ReadLaterButton;