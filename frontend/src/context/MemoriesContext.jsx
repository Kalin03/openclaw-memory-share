import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = '/api';

const MemoriesContext = createContext(null);

export const MemoriesProvider = ({ children }) => {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchMemories = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/memories?page=${pageNum}&limit=10`);
      setMemories(res.data.memories);
      setPage(res.data.pagination.page);
      setTotalPages(res.data.pagination.totalPages);
    } catch (error) {
      console.error('获取记忆列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const createMemory = async (data) => {
    const res = await axios.post(`${API_URL}/memories`, data);
    fetchMemories(page);
    return res.data.memory;
  };

  const deleteMemory = async (id) => {
    await axios.delete(`${API_URL}/memories/${id}`);
    fetchMemories(page);
  };

  const toggleLike = async (id) => {
    const res = await axios.post(`${API_URL}/memories/${id}/like`);
    fetchMemories(page);
    return res.data.liked;
  };

  const toggleBookmark = async (id) => {
    const res = await axios.post(`${API_URL}/memories/${id}/bookmark`);
    fetchMemories(page);
    return res.data.bookmarked;
  };

  return (
    <MemoriesContext.Provider value={{
      memories, loading, page, totalPages,
      fetchMemories, createMemory, deleteMemory, toggleLike, toggleBookmark
    }}>
      {children}
    </MemoriesContext.Provider>
  );
};

export const useMemories = () => useContext(MemoriesContext);