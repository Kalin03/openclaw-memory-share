import React, { useState, useEffect } from 'react';

const MemoryReferences = ({ memoryId }) => {
  const [references, setReferences] = useState([]);
  const [backlinks, setBacklinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('backlinks'); // 'references' or 'backlinks'

  useEffect(() => {
    fetchReferences();
  }, [memoryId]);

  const fetchReferences = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const [refsRes, backsRes] = await Promise.all([
        fetch(`/api/memories/${memoryId}/references`, { headers }),
        fetch(`/api/memories/${memoryId}/backlinks`, { headers })
      ]);

      if (refsRes.ok) {
        setReferences(await refsRes.json());
      }
      if (backsRes.ok) {
        setBacklinks(await backsRes.json());
      }
    } catch (error) {
      console.error('获取引用失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  const hasReferences = references.length > 0;
  const hasBacklinks = backlinks.length > 0;

  if (!hasReferences && !hasBacklinks) {
    return null;
  }

  const currentList = activeTab === 'references' ? references : backlinks;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.icon}>🔗</span>
        <span style={styles.title}>记忆引用</span>
      </div>

      {/* Tab 切换 */}
      {(hasReferences && hasBacklinks) && (
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'backlinks' ? styles.activeTab : {})
            }}
            onClick={() => setActiveTab('backlinks')}
          >
            引用自 ({backlinks.length})
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'references' ? styles.activeTab : {})
            }}
            onClick={() => setActiveTab('references')}
          >
            引用到 ({references.length})
          </button>
        </div>
      )}

      {/* 列表 */}
      <div style={styles.list}>
        {currentList.map((item, index) => (
          <a
            key={item.id}
            href={`/memory/${item.id}`}
            style={styles.item}
            onClick={(e) => {
              e.preventDefault();
              // 触发记忆详情显示
              window.dispatchEvent(new CustomEvent('showMemoryDetail', { detail: item.id }));
            }}
          >
            <div style={styles.itemTitle}>{item.title}</div>
            <div style={styles.itemMeta}>
              <span style={styles.author}>
                {item.avatar} {item.username}
              </span>
              <span style={styles.date}>
                {new Date(item.created_at).toLocaleDateString('zh-CN')}
              </span>
            </div>
            {item.tags && (
              <div style={styles.tags}>
                {item.tags.split(',').filter(Boolean).slice(0, 3).map((tag, i) => (
                  <span key={i} style={styles.tag}>#{tag.trim()}</span>
                ))}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid var(--border-color)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  icon: {
    fontSize: '18px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '8px',
  },
  tab: {
    padding: '6px 12px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  activeTab: {
    background: 'var(--primary-color)',
    color: 'white',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  item: {
    display: 'block',
    padding: '12px',
    backgroundColor: 'var(--bg-color)',
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'all 0.2s',
    border: '1px solid transparent',
  },
  itemTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    marginBottom: '6px',
  },
  itemMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  },
  author: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  date: {
    opacity: 0.8,
  },
  tags: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: '11px',
    color: 'var(--primary-color)',
    backgroundColor: 'var(--primary-light)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
};

export default MemoryReferences;