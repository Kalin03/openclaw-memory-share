import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = '/api';

const MemoriesContext = createContext(null);

export const MemoriesProvider = ({ children }) => {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isHotMode, setIsHotMode] = useState(false);

  const fetchMemories = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/memories?page=${pageNum}&limit=10`);
      setMemories(res.data.memories);
      setPage(res.data.pagination.page);
      setTotalPages(res.data.pagination.totalPages);
      setIsSearchMode(false);
      setIsHotMode(false);
      setSearchQuery('');
    } catch (error) {
      console.error('获取记忆列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHotMemories = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/memories/hot?page=${pageNum}&limit=10`);
      setMemories(res.data.memories);
      setPage(res.data.pagination.page);
      setTotalPages(res.data.pagination.totalPages);
      setIsSearchMode(false);
      setIsHotMode(true);
      setSearchQuery('');
    } catch (error) {
      console.error('获取热门记忆失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchMemories = async (query, pageNum = 1) => {
    if (!query || query.trim() === '') {
      fetchMemories(1);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/memories/search?q=${encodeURIComponent(query)}&page=${pageNum}&limit=10`);
      setMemories(res.data.memories);
      setPage(res.data.pagination.page);
      setTotalPages(res.data.pagination.totalPages);
      setSearchQuery(query);
      setIsSearchMode(true);
      setIsHotMode(false);
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const createMemory = async (data) => {
    const res = await axios.post(`${API_URL}/memories`, data);
    if (isSearchMode) {
      searchMemories(searchQuery, page);
    } else if (isHotMode) {
      fetchHotMemories(page);
    } else {
      fetchMemories(page);
    }
    return res.data.memory;
  };

  const deleteMemory = async (id) => {
    await axios.delete(`${API_URL}/memories/${id}`);
    if (isSearchMode) {
      searchMemories(searchQuery, page);
    } else if (isHotMode) {
      fetchHotMemories(page);
    } else {
      fetchMemories(page);
    }
  };

  const updateMemory = async (id, data) => {
    const res = await axios.put(`${API_URL}/memories/${id}`, data);
    if (isSearchMode) {
      searchMemories(searchQuery, page);
    } else if (isHotMode) {
      fetchHotMemories(page);
    } else {
      fetchMemories(page);
    }
    return res.data.memory;
  };

  const toggleLike = async (id) => {
    const res = await axios.post(`${API_URL}/memories/${id}/like`);
    if (isSearchMode) {
      searchMemories(searchQuery, page);
    } else if (isHotMode) {
      fetchHotMemories(page);
    } else {
      fetchMemories(page);
    }
    return res.data.liked;
  };

  const toggleBookmark = async (id) => {
    const res = await axios.post(`${API_URL}/memories/${id}/bookmark`);
    if (isSearchMode) {
      searchMemories(searchQuery, page);
    } else if (isHotMode) {
      fetchHotMemories(page);
    } else {
      fetchMemories(page);
    }
    return res.data.bookmarked;
  };

  return (
    <MemoriesContext.Provider value={{
      memories, loading, page, totalPages, searchQuery, isSearchMode, isHotMode,
      fetchMemories, fetchHotMemories, searchMemories, createMemory, updateMemory, deleteMemory, toggleLike, toggleBookmark
    }}>
      {children}
    </MemoriesContext.Provider>
  );
};

export const useMemories = () => {
  const context = useContext(MemoriesContext);
  if (!context) {
    throw new Error('useMemories must be used within a MemoriesProvider');
  }
  return context;
};