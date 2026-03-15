import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Navbar from './components/Navbar';
import MemoryCard from './components/MemoryCard';
import MemoryCardSkeleton from './components/MemoryCardSkeleton';
import AuthModal from './components/AuthModal';
import CreateMemoryModal from './components/CreateMemoryModal';
import EditMemoryModal from './components/EditMemoryModal';
import UserProfile from './components/UserProfile';
import RandomMemory from './components/RandomMemory';
import TagCloud from './components/TagCloud';
import PersonalizedRecommendations from './components/PersonalizedRecommendations';
import ViewHistory from './components/ViewHistory';
import MemoryGraph from './components/MemoryGraph';
import BackToTop from './components/BackToTop';
import MemoryDetail from './components/MemoryDetail';
import SeriesDetail from './components/SeriesDetail';
import CheckinCard from './components/CheckinCard';
import CheckinLeaderboard from './components/CheckinLeaderboard';
import HotSeries from './components/HotSeries';
import BatchOperationsToolbar from './components/BatchOperationsToolbar';
import Moments from './components/Moments';
import AdvancedSearchFilter from './components/AdvancedSearchFilter';
import CalendarView from './components/CalendarView';
import ReminderManager from './components/ReminderManager';
import SkipToContent from './components/SkipToContent';
import OfflineIndicator from './components/OfflineIndicator';
import ReadLaterList from './components/ReadLaterList';
import ArchiveList from './components/ArchiveList';
import CommandPalette from './components/CommandPalette';
import BadgeShowcase from './components/BadgeShowcase';
import RSSSubscription from './components/RSSSubscription';
import DataBackupRestore from './components/DataBackupRestore';
import QuickCapture from './components/QuickCapture';
import BookmarkletSetup from './components/BookmarkletSetup';
import ReadingProgressBar from './components/ReadingProgressBar';
import WebhookManager from './components/WebhookManager';
import UserPreferences from './components/UserPreferences';
import { useKeyboardShortcuts, ShortcutsHelp } from './components/KeyboardShortcuts';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MemoriesProvider, useMemories } from './context/MemoriesContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChevronLeft, ChevronRight, Search, Clock, Flame, Loader2, Users, CheckSquare, Square, Keyboard, Calendar } from 'lucide-react';

const Home = () => {
  const { loading: authLoading, user } = useAuth();
  const { memories, loading, page, totalPages, searchQuery, searchFilters, isSearchMode, fetchMemories, searchMemories, resetSearchFilters, deleteMemory, fetchHotMemories, fetchFollowingMemories, isFollowingMode } = useMemories();
  const { showToast } = useToast();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMoments, setShowMoments] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showReadLater, setShowReadLater] = useState(false);
  const [showArchives, setShowArchives] = useState(false);
  const [showViewHistory, setShowViewHistory] = useState(false);
  const [showMemoryGraph, setShowMemoryGraph] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showRSS, setShowRSS] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [showBookmarklet, setShowBookmarklet] = useState(false);
  const [showWebhooks, setShowWebhooks] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [reminderMemory, setReminderMemory] = useState(null);
  const [editingMemory, setEditingMemory] = useState(null);
  const [activeTab, setActiveTab] = useState('latest');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchInputRef = useRef(null);
  
  // Batch selection state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Track if any modal is open
  const hasOpenModal = showAuthModal || showCreateModal || showProfileModal || editingMemory || showMoments;
  
  // Keyboard shortcuts
  const { showHelp, setShowHelp, ShortcutsHelp: ShortcutsHelpModal } = useKeyboardShortcuts({
    onCreateMemory: () => {
      if (user) {
        setShowCreateModal(true);
      } else {
        setShowAuthModal(true);
        showToast('请先登录后再创建记忆', 'info');
      }
    },
    onFocusSearch: () => {
      const searchInput = document.querySelector('input[type="text"][placeholder*="搜索"]');
      if (searchInput) {
        searchInput.focus();
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    onRandomMemory: () => {
      // Scroll to random memory section and click "换一条"
      const refreshBtn = document.querySelector('[title="换一条"]');
      if (refreshBtn) {
        refreshBtn.click();
        showToast('已为你切换随机记忆', 'success');
      }
    },
    onGoHome: () => {
      navigate('/');
      showToast('已返回首页', 'success');
    },
    onGoProfile: () => {
      if (user) {
        setShowProfileModal(true);
      } else {
        setShowAuthModal(true);
        showToast('请先登录', 'info');
      }
    },
    onCloseModal: () => {
      // Close any open modal
      if (editingMemory) setEditingMemory(null);
      else if (showCreateModal) setShowCreateModal(false);
      else if (showProfileModal) setShowProfileModal(false);
      else if (showAuthModal) setShowAuthModal(false);
      else if (showHelp) setShowHelp(false);
      else if (showCommandPalette) setShowCommandPalette(false);
    },
    isEnabled: location.pathname === '/', // Only enable on home page
  });

  // Command palette shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Command palette action handler
  const handleCommandAction = (action) => {
    switch (action) {
      case 'new-memory':
        if (user) {
          setShowCreateModal(true);
        } else {
          setShowAuthModal(true);
        }
        break;
      case 'search':
        const searchInput = document.querySelector('input[type="text"][placeholder*="搜索"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      case 'hot':
        navigate('/');
        setActiveTab('hot');
        fetchHotMemories(1);
        break;
      case 'calendar':
        setShowCalendar(true);
        break;
      case 'bookmarks':
        setShowProfileModal(true);
        break;
      case 'read-later':
        setShowReadLater(true);
        break;
      case 'archives':
        setShowArchives(true);
        break;
      case 'trash':
        navigate('/?trash=true');
        showToast('回收站功能已移动到个人主页', 'info');
        break;
      case 'moments':
        setShowMoments(true);
        break;
      case 'tags':
        showToast('标签管理功能已移动到个人主页', 'info');
        setShowProfileModal(true);
        break;
      case 'stats':
        setShowProfileModal(true);
        break;
      case 'reminders':
        setShowReminders(true);
        break;
      case 'graph':
        setShowMemoryGraph(true);
        break;
      case 'shortcuts':
        setShowHelp(true);
        break;
      case 'help':
        showToast('帮助中心功能开发中', 'info');
        break;
      case 'badges':
        setShowBadges(true);
        break;
      case 'rss':
        setShowRSS(true);
        break;
      case 'backup':
        setShowBackup(true);
        break;
      case 'quick-capture':
        setShowQuickCapture(true);
        break;
      case 'bookmarklet':
        setShowBookmarklet(true);
        break;
      case 'webhooks':
        setShowWebhooks(true);
        break;
      case 'preferences':
        setShowPreferences(true);
        break;
      default:
        break;
    }
  };

  // Handle selection toggle
  const handleSelectToggle = (memoryId) => {
    setSelectedIds(prev => 
      prev.includes(memoryId) 
        ? prev.filter(id => id !== memoryId)
        : [...prev, memoryId]
    );
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Handle batch operation complete
  const handleBatchComplete = () => {
    handleClearSelection();
    // Refresh memories
    if (isSearchMode) {
      searchMemories(searchQuery, page);
    } else if (activeTab === 'latest') {
      fetchMemories(page);
    } else if (activeTab === 'hot') {
      fetchHotMemories(page);
    } else if (activeTab === 'following') {
      fetchFollowingMemories(page);
    }
  };

  // Reset selection when tab changes
  useEffect(() => {
    setIsSelectMode(false);
    setSelectedIds([]);
  }, [activeTab]);

  // 处理 URL 参数：search 和 edit
  useEffect(() => {
    const searchParam = searchParams.get('search');
    const editParam = searchParams.get('edit');
    
    if (searchParam) {
      searchMemories(searchParam, 1);
    } else {
      fetchMemories(1);
    }
    
    // 处理编辑模式：从 URL 获取记忆 ID 并打开编辑弹窗
    if (editParam) {
      // 需要先获取记忆详情
      import('axios').then(axios => {
        axios.default.get(`/api/memories/${editParam}`).then(res => {
          setEditingMemory(res.data);
        }).catch(err => {
          console.error('获取记忆失败:', err);
        });
      });
    }
  }, [searchParams]);

  const handleDelete = async (id) => {
    // 找到要删除的记忆，保存数据用于撤销
    const memoryToDelete = memories.find(m => m.id === id);
    if (!memoryToDelete) return;

    // 先从 UI 中移除
    const previousMemories = [...memories];
    
    try {
      // 执行删除（软删除到回收站）
      await axios.delete(`/api/memories/${id}`);
      
      // 刷新列表
      if (isSearchMode) {
        searchMemories(searchQuery, page);
      } else if (isFollowingMode) {
        fetchFollowingMemories(page);
      } else {
        fetchMemories(page);
      }
      
      // 显示带撤销按钮的 toast
      showToast.withUndo(
        `已删除「${memoryToDelete.title?.slice(0, 20) || '记忆'}」`,
        async () => {
          // 撤销操作：从回收站恢复
          try {
            await axios.post(`/api/trash/${id}/restore`);
            // 刷新列表
            if (isSearchMode) {
              searchMemories(searchQuery, page);
            } else if (isFollowingMode) {
              fetchFollowingMemories(page);
            } else {
              fetchMemories(page);
            }
          } catch (err) {
            console.error('恢复失败:', err);
            showToast.error('恢复失败');
          }
        },
        { type: 'warning' }
      );
    } catch (err) {
      console.error('删除失败:', err);
      showToast.error('删除失败');
    }
  };

  const handleEdit = (memory) => {
    setEditingMemory(memory);
  };

  const handleSearch = (query) => {
    if (query) {
      navigate(`/?search=${encodeURIComponent(query)}`);
    } else {
      navigate('/');
    }
  };

  const handleTagClick = (tag) => {
    navigate(`/?search=${encodeURIComponent(tag)}`);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'latest') {
      fetchMemories(1);
    } else if (tab === 'hot') {
      fetchHotMemories(1);
    } else if (tab === 'following') {
      fetchFollowingMemories(1);
    }
  };

  const handlePageChange = (newPage) => {
    if (isSearchMode) {
      navigate(`/?search=${encodeURIComponent(searchQuery)}&page=${newPage}`);
    } else if (activeTab === 'latest') {
      fetchMemories(newPage);
    } else if (activeTab === 'hot') {
      fetchHotMemories(newPage);
    } else if (activeTab === 'following') {
      fetchFollowingMemories(newPage);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light flex flex-col">
      <OfflineIndicator />
      <SkipToContent />
      <Navbar
        onAuthClick={() => setShowAuthModal(true)}
        onCreateClick={() => setShowCreateModal(true)}
        onSearch={handleSearch}
        onProfileClick={() => setShowProfileModal(true)}
        onMomentsClick={() => setShowMoments(true)}
        onRemindersClick={() => {
          setReminderMemory(null);
          setShowReminders(true);
        }}
        onReadLaterClick={() => setShowReadLater(true)}
        onArchivesClick={() => setShowArchives(true)}
        onViewHistoryClick={() => setShowViewHistory(true)}
        onMemoryGraphClick={() => setShowMemoryGraph(true)}
      />

      {/* Hero Section */}
      <div id="main-content" className="bg-gradient-to-r from-primary/10 to-secondary/10 py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-dark mb-3">
            分享你的龙虾记忆 🦞
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            记录、分享、发现。这里是OpenClaw社区的记忆分享平台，
            分享你的AI使用心得、技巧和灵感。
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="flex gap-8">
          {/* Left Content */}
          <div className="flex-1 min-w-0">
            {/* Random Memory */}
            {!isSearchMode && <RandomMemory onTagClick={handleTagClick} />}
            
            {/* Personalized Recommendations */}
            {!isSearchMode && user && <PersonalizedRecommendations limit={5} />}
            
            {/* Tab Switcher */}
            {!isSearchMode && (
              <div className="flex gap-2 mb-6 items-center flex-wrap">
                <button
                  onClick={() => handleTabChange('latest')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'latest'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50 border'
                  }`}
                  style={{ backgroundColor: activeTab === 'latest' ? undefined : 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
                >
                  <Clock size={18} />
                  最新
                </button>
                <button
                  onClick={() => handleTabChange('hot')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'hot'
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50 border'
                  }`}
                  style={{ backgroundColor: activeTab === 'hot' ? undefined : 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
                >
                  <Flame size={18} />
                  热门
                </button>
                {user && (
                  <button
                    onClick={() => handleTabChange('following')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      activeTab === 'following'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-50 border'
                    }`}
                    style={{ backgroundColor: activeTab === 'following' ? undefined : 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
                  >
                    <Users size={18} />
                    关注
                  </button>
                )}
                
                {/* Batch Select Toggle - only show for logged in users */}
                {user && memories.length > 0 && (
                  <button
                    onClick={() => {
                      setIsSelectMode(!isSelectMode);
                      if (isSelectMode) {
                        setSelectedIds([]);
                      }
                    }}
                    className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      isSelectMode
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-50 border'
                    }`}
                    style={!isSelectMode ? { backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' } : {}}
                  >
                    {isSelectMode ? <CheckSquare size={18} /> : <Square size={18} />}
                    {isSelectMode ? '取消选择' : '批量选择'}
                  </button>
                )}
              </div>
            )}
            
            {/* Search Results Header */}
            {isSearchMode && (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <Search size={20} />
                    <span>搜索 "{searchQuery}" 的结果：{memories.length} 条</span>
                  </div>
                  <button
                    onClick={() => navigate('/')}
                    className="text-primary hover:underline"
                  >
                    清除搜索
                  </button>
                </div>
                {/* Advanced Search Filter */}
                <AdvancedSearchFilter
                  filters={searchFilters}
                  onFilterChange={(newFilters) => {
                    searchMemories(searchQuery, 1, newFilters);
                  }}
                  onReset={() => {
                    resetSearchFilters();
                    if (searchQuery) {
                      searchMemories(searchQuery, 1, {
                        startDate: '',
                        endDate: '',
                        tags: '',
                        author: '',
                        sort: 'relevance'
                      });
                    }
                  }}
                />
              </>
            )}

            {loading ? (
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <MemoryCardSkeleton key={i} />
                ))}
              </div>
            ) : memories.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">🦞</span>
                {isSearchMode ? (
                  <>
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>没有找到相关记忆</h3>
                    <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>试试其他关键词？</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>还没有记忆</h3>
                    <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>成为第一个分享记忆的人吧！</p>
                  </>
                )}
                <button
                  onClick={() => navigate('/')}
                  className="btn-primary"
                >
                  查看全部记忆
                </button>
              </div>
            ) : (
              <>
                {/* 瀑布流布局 */}
                <div 
                  className="masonry-grid"
                  style={{
                    columnCount: 'auto',
                    columnWidth: '320px',
                    columnGap: '24px',
                  }}
                >
                  {memories.map(memory => (
                    <div 
                      key={memory.id} 
                      style={{ breakInside: 'avoid', marginBottom: '24px' }}
                    >
                      <MemoryCard 
                        memory={memory}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                        onTagClick={handleTagClick}
                        searchQuery={isSearchMode ? searchQuery : null}
                        isSelectMode={isSelectMode}
                        isSelected={selectedIds.includes(memory.id)}
                        onSelect={handleSelectToggle}
                      />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-8">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      <ChevronLeft size={24} />
                    </button>
                    
                    <span style={{ color: 'var(--text-secondary)' }}>
                      第 {page} / {totalPages} 页
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                      className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      <ChevronRight size={24} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <CheckinCard />
              
              {/* Badge Entry */}
              <div 
                className="p-4 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
                onClick={() => setShowBadges(true)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>徽章成就</h3>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>查看你的成就</p>
                  </div>
                </div>
              </div>
              
              {/* Calendar Entry */}
              <div 
                className="p-4 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
                onClick={() => setShowCalendar(true)}
              >
                <div className="flex items-center gap-3">
                  <Calendar size={24} className="text-primary" />
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>记忆日历</h3>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>按日期查看记忆</p>
                  </div>
                </div>
              </div>
              
              <CheckinLeaderboard />
              <HotSeries />
              <TagCloud onTagClick={handleTagClick} />
              
              {/* Keyboard Shortcuts Hint */}
              <div 
                className="p-4 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
                onClick={() => setShowHelp(true)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Keyboard size={18} className="text-primary" />
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>快捷键</span>
                </div>
                <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                  <p><kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">N</kbd> 新建记忆</p>
                  <p><kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">/</kbd> 搜索</p>
                  <p><kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">?</kbd> 查看全部</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-auto" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
        <div className="max-w-6xl mx-auto px-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          <p>🦞 OpenClaw Memory Share © 2026</p>
          <p className="mt-1">Made with ❤️ by the OpenClaw community</p>
          <p className="mt-2">
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
              渝ICP备2024028971号-1
            </a>
          </p>
        </div>
      </footer>

      {/* Modals */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showCreateModal && <CreateMemoryModal onClose={() => setShowCreateModal(false)} />}
      {editingMemory && <EditMemoryModal memory={editingMemory} onClose={() => {
        setEditingMemory(null);
        navigate(window.location.pathname);
      }} />}
      {showProfileModal && <UserProfile onClose={() => setShowProfileModal(false)} />}
      {showMoments && <Moments user={user} onBack={() => setShowMoments(false)} />}
      
      {/* Command Palette */}
      <CommandPalette 
        isOpen={showCommandPalette} 
        onClose={() => setShowCommandPalette(false)}
        onNavigate={handleCommandAction}
      />
      
      {/* Badge Showcase */}
      {showBadges && (
        <BadgeShowcase onClose={() => setShowBadges(false)} />
      )}
      
      {/* RSS Subscription */}
      {showRSS && (
        <RSSSubscription onClose={() => setShowRSS(false)} />
      )}
      
      {/* Data Backup & Restore */}
      {showBackup && (
        <DataBackupRestore onClose={() => setShowBackup(false)} />
      )}
      
      {/* Quick Capture */}
      {showQuickCapture && (
        <QuickCapture onClose={() => setShowQuickCapture(false)} />
      )}
      
      {/* Bookmarklet Setup */}
      {showBookmarklet && (
        <BookmarkletSetup onClose={() => setShowBookmarklet(false)} />
      )}
      
      {/* Webhook Manager */}
      {showWebhooks && (
        <WebhookManager onClose={() => setShowWebhooks(false)} />
      )}
      
      {/* User Preferences */}
      {showPreferences && (
        <UserPreferences onClose={() => setShowPreferences(false)} />
      )}
      
      {/* Keyboard Shortcuts Help Modal */}
      <ShortcutsHelpModal />
      
      {/* Back to Top Button */}
      <BackToTop />
      
      {/* Batch Operations Toolbar */}
      {isSelectMode && selectedIds.length > 0 && (
        <BatchOperationsToolbar
          selectedIds={selectedIds}
          onClearSelection={handleClearSelection}
          onComplete={handleBatchComplete}
          userId={user?.id}
        />
      )}

      {/* Calendar View */}
      {showCalendar && (
        <CalendarView 
          onClose={() => setShowCalendar(false)}
          onMemoryClick={(memory) => {
            setShowCalendar(false);
            navigate(`/memory/${memory.id}`);
          }}
        />
      )}

      {/* Reminder Manager */}
      {showReminders && (
        <ReminderManager 
          onClose={() => {
            setShowReminders(false);
            setReminderMemory(null);
          }}
          memoryId={reminderMemory?.id}
          memoryTitle={reminderMemory?.title}
        />
      )}

      {/* Read Later List */}
      <ReadLaterList 
        isOpen={showReadLater}
        onClose={() => setShowReadLater(false)}
      />

      {/* Archive List */}
      <ArchiveList 
        isOpen={showArchives}
        onClose={() => setShowArchives(false)}
      />

      {/* View History */}
      <ViewHistory 
        isOpen={showViewHistory}
        onClose={() => setShowViewHistory(false)}
      />

      {/* Memory Graph */}
      <MemoryGraph 
        isOpen={showMemoryGraph}
        onClose={() => setShowMemoryGraph(false)}
      />
    </div>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MemoriesProvider>
          <ToastProvider>
            <ReadingProgressBar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/memory/:id" element={<MemoryDetail />} />
              <Route path="/series/:id" element={<SeriesDetail />} />
            </Routes>
          </ToastProvider>
        </MemoriesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;