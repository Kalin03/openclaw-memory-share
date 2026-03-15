import React, { useState, useRef, useEffect } from 'react';
import { Smile, X } from 'lucide-react';

const EMOJI_CATEGORIES = {
  '表情': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯'],
  '手势': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🙏', '💪', '🦾'],
  '爱心': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️'],
  '符号': ['🔥', '⭐', '🌟', '✨', '💫', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '💯', '✅', '❌', '❓', '❗', '💡', '📌', '📍', '🔖', '🏷️', '💼', '📁', '📚', '📝', '✏️', '🖊️', '📱', '💻', '🖥️', '⌨️', '🖱️', '🔧', '⚙️', '🎯', '🚀', '🎨', '🎬', '🎵', '🎶'],
  '食物': ['🍎', '🍊', '🍋', '🍌', '🍇', '🍉', '🍓', '🫐', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃'],
  '动物': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥']
};

const RECENT_KEY = 'emoji-picker-recent';
const MAX_RECENT = 20;

const EmojiPicker = ({ onSelect, onClose }) => {
  const [activeCategory, setActiveCategory] = useState('表情');
  const [recentEmojis, setRecentEmojis] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const pickerRef = useRef(null);

  useEffect(() => {
    // Load recent emojis
    const saved = localStorage.getItem(RECENT_KEY);
    if (saved) {
      try {
        setRecentEmojis(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load recent emojis:', e);
      }
    }
  }, []);

  useEffect(() => {
    // Close on click outside
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        if (onClose) onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleEmojiClick = (emoji) => {
    // Save to recent
    const newRecent = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, MAX_RECENT);
    setRecentEmojis(newRecent);
    localStorage.setItem(RECENT_KEY, JSON.stringify(newRecent));

    if (onSelect) {
      onSelect(emoji);
    }
  };

  const categories = Object.keys(EMOJI_CATEGORIES);

  // Filter emojis by search
  const getFilteredEmojis = () => {
    const categoryEmojis = EMOJI_CATEGORIES[activeCategory] || [];
    if (!searchQuery.trim()) return categoryEmojis;
    
    // Simple search - could be enhanced with emoji names
    return categoryEmojis;
  };

  const displayEmojis = getFilteredEmojis();

  return (
    <div
      ref={pickerRef}
      className="absolute z-50 w-80 rounded-xl shadow-2xl border overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
    >
      {/* Header */}
      <div className="p-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-1">
          <Smile size={16} className="text-primary" />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Emoji</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={14} style={{ color: 'var(--text-secondary)' }} />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="p-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索 emoji..."
          className="w-full px-3 py-1.5 rounded-lg text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto border-b" style={{ borderColor: 'var(--border-color)' }}>
        {recentEmojis.length > 0 && (
          <button
            onClick={() => setActiveCategory('最近')}
            className={`px-3 py-2 text-xs whitespace-nowrap transition-colors ${
              activeCategory === '最近' ? 'text-primary border-b-2 border-primary' : ''
            }`}
            style={{ color: activeCategory === '最近' ? undefined : 'var(--text-secondary)' }}
          >
            最近
          </button>
        )}
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-2 text-xs whitespace-nowrap transition-colors ${
              activeCategory === category ? 'text-primary border-b-2 border-primary' : ''
            }`}
            style={{ color: activeCategory === category ? undefined : 'var(--text-secondary)' }}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="p-2 h-64 overflow-y-auto">
        {activeCategory === '最近' && recentEmojis.length > 0 ? (
          <div className="grid grid-cols-8 gap-1">
            {recentEmojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => handleEmojiClick(emoji)}
                className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {displayEmojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => handleEmojiClick(emoji)}
                className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmojiPicker;