import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MemoryCard from './components/MemoryCard';
import AuthModal from './components/AuthModal';
import CreateMemoryModal from './components/CreateMemoryModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MemoriesProvider, useMemories } from './context/MemoriesContext';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const AppContent = () => {
  const { loading: authLoading } = useAuth();
  const { memories, loading, page, totalPages, fetchMemories, deleteMemory } = useMemories();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchMemories(1);
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这条记忆吗？')) {
      await deleteMemory(id);
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
      <Navbar
        onAuthClick={() => setShowAuthModal(true)}
        onCreateClick={() => setShowCreateModal(true)}
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 py-12">
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
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🦞</span>
            <h3 className="text-xl font-bold text-dark mb-2">还没有记忆</h3>
            <p className="text-gray-500 mb-6">成为第一个分享记忆的人吧！</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              发布第一条记忆
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              {memories.map(memory => (
                <MemoryCard 
                  key={memory.id} 
                  memory={memory}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => fetchMemories(page - 1)}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={24} />
                </button>
                
                <span className="text-gray-600">
                  第 {page} / {totalPages} 页
                </span>
                
                <button
                  onClick={() => fetchMemories(page + 1)}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
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
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <MemoriesProvider>
        <AppContent />
      </MemoriesProvider>
    </AuthProvider>
  );
};

export default App;