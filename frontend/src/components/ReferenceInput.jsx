import React, { useState, useEffect, useRef } from 'react';

const ReferenceInput = ({ content, onInsert, textareaRef }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const pickerRef = useRef(null);

  // 监听输入，检测 [[ 触发引用选择器
  useEffect(() => {
    if (!textareaRef?.current) return;

    const handleInput = (e) => {
      const cursorPos = textareaRef.current.selectionStart;
      const textBeforeCursor = content.substring(0, cursorPos);
      
      // 检测是否输入了 [[
      const lastTwoChars = textBeforeCursor.slice(-2);
      if (lastTwoChars === '[[') {
        const rect = textareaRef.current.getBoundingClientRect();
        const lineHeight = parseInt(getComputedStyle(textareaRef.current).lineHeight) || 20;
        
        // 计算光标位置
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines.length;
        const currentCol = lines[lines.length - 1].length;
        
        setPosition({
          top: Math.min(rect.top + currentLine * lineHeight, window.innerHeight - 300),
          left: Math.min(rect.left + currentCol * 8, window.innerWidth - 320),
        });
        setShowPicker(true);
        setSearchTerm('');
      }
    };

    textareaRef.current.addEventListener('input', handleInput);
    return () => {
      textareaRef.current?.removeEventListener('input', handleInput);
    };
  }, [content, textareaRef]);

  // 搜索记忆
  useEffect(() => {
    if (!showPicker) return;

    const searchMemories = async () => {
      if (searchTerm.length < 1) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/memories/search-for-reference?q=${encodeURIComponent(searchTerm)}`);
        if (res.ok) {
          setSearchResults(await res.json());
        }
      } catch (error) {
        console.error('搜索失败:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchMemories, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, showPicker]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  // 选择记忆插入引用
  const handleSelect = (memory) => {
    if (!textareaRef?.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const textBefore = content.substring(0, cursorPos - 2); // 移除 [[
    const textAfter = content.substring(cursorPos);
    
    const reference = `[[${memory.id}]]`;
    const newContent = textBefore + reference + textAfter;
    
    onInsert(newContent);
    setShowPicker(false);
    
    // 设置光标位置
    setTimeout(() => {
      const newCursorPos = textBefore.length + reference.length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  if (!showPicker) return null;

  return (
    <div
      ref={pickerRef}
      style={{
        ...styles.picker,
        top: position.top,
        left: position.left,
      }}
    >
      <input
        type="text"
        placeholder="搜索要引用的记忆..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={styles.searchInput}
        autoFocus
      />
      
      <div style={styles.results}>
        {loading ? (
          <div style={styles.loading}>搜索中...</div>
        ) : searchResults.length === 0 ? (
          searchTerm.length > 0 ? (
            <div style={styles.noResults}>未找到匹配的记忆</div>
          ) : (
            <div style={styles.hint}>输入关键词搜索记忆</div>
          )
        ) : (
          searchResults.map((memory) => (
            <button
              key={memory.id}
              style={styles.resultItem}
              onClick={() => handleSelect(memory)}
            >
              <div style={styles.resultTitle}>{memory.title}</div>
              <div style={styles.resultMeta}>
                {memory.avatar} {memory.username} · {new Date(memory.created_at).toLocaleDateString('zh-CN')}
              </div>
            </button>
          ))
        )}
      </div>
      
      <div style={styles.footer}>
        <span style={styles.footerText}>输入 [[ 记忆ID ]] 或搜索选择</span>
        <button style={styles.closeBtn} onClick={() => setShowPicker(false)}>关闭</button>
      </div>
    </div>
  );
};

const styles = {
  picker: {
    position: 'fixed',
    width: '300px',
    maxHeight: '400px',
    backgroundColor: 'var(--card-bg)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
    border: '1px solid var(--border-color)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  searchInput: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'transparent',
    fontSize: '14px',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  results: {
    maxHeight: '250px',
    overflowY: 'auto',
  },
  loading: {
    padding: '20px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  noResults: {
    padding: '20px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  hint: {
    padding: '20px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  resultItem: {
    width: '100%',
    padding: '12px',
    border: 'none',
    backgroundColor: 'transparent',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  resultTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  resultMeta: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  footer: {
    padding: '8px 12px',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  closeBtn: {
    padding: '4px 8px',
    fontSize: '12px',
    border: 'none',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-secondary)',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default ReferenceInput;