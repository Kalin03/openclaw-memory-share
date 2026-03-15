import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import axios from 'axios';
import EmojiPicker from './EmojiPicker';

const API_URL = '/api';

const MentionInput = ({ value, onChange, placeholder, className, minRows = 3 }) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [users, setUsers] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);

  // 搜索用户
  useEffect(() => {
    if (mentionSearch.length > 0) {
      const searchUsers = async () => {
        try {
          const res = await axios.get(`${API_URL}/users/search?q=${encodeURIComponent(mentionSearch)}`);
          setUsers(res.data);
          setSelectedIndex(0);
        } catch (err) {
          console.error('搜索用户失败:', err);
          setUsers([]);
        }
      };
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [mentionSearch]);

  // 处理输入变化
  const handleInput = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    onChange(newValue);

    // 检测是否在输入@
    let atIndex = -1;
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (newValue[i] === '@') {
        // 检查@前面是否是空格或开头
        if (i === 0 || newValue[i - 1] === ' ' || newValue[i - 1] === '\n') {
          atIndex = i;
        }
        break;
      } else if (newValue[i] === ' ' || newValue[i] === '\n') {
        break;
      }
    }

    if (atIndex !== -1 && atIndex < cursorPos) {
      const searchText = newValue.substring(atIndex + 1, cursorPos);
      setMentionSearch(searchText);
      setMentionStartIndex(atIndex);

      // 计算下拉框位置
      const textarea = textareaRef.current;
      const rect = textarea.getBoundingClientRect();
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
      
      // 简单的位置计算
      const lines = newValue.substring(0, cursorPos).split('\n');
      const currentLine = lines.length;
      const currentCol = lines[lines.length - 1].length;
      
      setMentionPosition({
        top: rect.top + (currentLine * lineHeight) - textarea.scrollTop,
        left: Math.min(rect.left + currentCol * 8, rect.right - 200)
      });

      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionSearch('');
      setMentionStartIndex(-1);
    }
  };

  // 选择用户
  const selectUser = (user) => {
    if (mentionStartIndex === -1) return;

    const cursorPos = textareaRef.current.selectionStart;
    const beforeMention = value.substring(0, mentionStartIndex);
    const afterCursor = value.substring(cursorPos);
    
    // 插入用户名（确保后面有空格）
    const newValue = `${beforeMention}@${user.username} ${afterCursor}`;
    onChange(newValue);

    // 移动光标到插入的用户名后面
    const newCursorPos = mentionStartIndex + user.username.length + 2;
    setTimeout(() => {
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      textareaRef.current?.focus();
    }, 0);

    setShowMentions(false);
    setMentionSearch('');
    setMentionStartIndex(-1);
  };

  // 键盘导航
  const handleKeyDown = (e) => {
    if (!showMentions || users.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % users.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + users.length) % users.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      selectUser(users[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && 
          textareaRef.current && !textareaRef.current.contains(e.target)) {
        setShowMentions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        className={className}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={minRows}
      />

      {/* Emoji 按钮 */}
      <button
        type="button"
        onClick={() => setShowEmoji(!showEmoji)}
        className="absolute right-2 bottom-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="添加表情"
      >
        <Smile size={18} style={{ color: 'var(--text-secondary)' }} />
      </button>

      {/* Emoji 选择器 */}
      {showEmoji && (
        <div className="absolute right-0 bottom-10">
          <EmojiPicker
            onSelect={(emoji) => {
              // 在光标位置插入emoji
              const textarea = textareaRef.current;
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const newValue = value.substring(0, start) + emoji + value.substring(end);
              onChange(newValue);
              setShowEmoji(false);
              
              // 恢复光标位置
              setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + emoji.length, start + emoji.length);
              }, 0);
            }}
            onClose={() => setShowEmoji(false)}
          />
        </div>
      )}

      {/* @用户选择下拉框 */}
      {showMentions && users.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto"
          style={{
            top: '100%',
            left: 0,
            minWidth: '200px'
          }}
        >
          {users.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onClick={() => selectUser(user)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                index === selectedIndex
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className="text-xl">{user.avatar || '🦞'}</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {user.username}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;