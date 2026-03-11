const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8282;
const JWT_SECRET = process.env.JWT_SECRET || 'openclaw-memory-share-secret-2024';
const DB_PATH = path.join(__dirname, '../data/memory.db');

// Middleware
app.use(cors());
app.use(express.json());

let db;

// Initialize database
async function initDB() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar TEXT DEFAULT '🦞',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT DEFAULT '',
      likes_count INTEGER DEFAULT 0,
      bookmarks_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      memory_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, memory_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      memory_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, memory_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      memory_id TEXT NOT NULL,
      content TEXT NOT NULL,
      reply_to_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 添加 views_count 字段（如果不存在）
  try {
    const columns = db.exec("PRAGMA table_info(memories)");
    const hasViewsCount = columns[0]?.values?.some(col => col[1] === 'views_count');
    if (!hasViewsCount) {
      db.run('ALTER TABLE memories ADD COLUMN views_count INTEGER DEFAULT 0');
      console.log('Added views_count column to memories table');
    }
  } catch (e) {
    console.log('views_count column check/creation skipped:', e.message);
  }

  // 添加 comments 表的 reply_to_id 字段（如果不存在）
  try {
    const commentColumns = db.exec("PRAGMA table_info(comments)");
    const hasReplyToId = commentColumns[0]?.values?.some(col => col[1] === 'reply_to_id');
    if (!hasReplyToId) {
      db.run('ALTER TABLE comments ADD COLUMN reply_to_id TEXT');
      console.log('Added reply_to_id column to comments table');
    }
  } catch (e) {
    console.log('reply_to_id column check/creation skipped:', e.message);
  }

  // 添加 is_pinned 字段（如果不存在）
  try {
    const columns = db.exec("PRAGMA table_info(memories)");
    const hasIsPinned = columns[0]?.values?.some(col => col[1] === 'is_pinned');
    if (!hasIsPinned) {
      db.run('ALTER TABLE memories ADD COLUMN is_pinned INTEGER DEFAULT 0');
      console.log('Added is_pinned column to memories table');
    }
  } catch (e) {
    console.log('is_pinned column check/creation skipped:', e.message);
  }

  // 添加 visibility 字段（如果不存在）
  try {
    const columns = db.exec("PRAGMA table_info(memories)");
    const hasVisibility = columns[0]?.values?.some(col => col[1] === 'visibility');
    if (!hasVisibility) {
      db.run("ALTER TABLE memories ADD COLUMN visibility TEXT DEFAULT 'public'");
      console.log('Added visibility column to memories table');
    }
  } catch (e) {
    console.log('visibility column check/creation skipped:', e.message);
  }

  // 创建签到表
  db.run(`
    CREATE TABLE IF NOT EXISTS sign_ins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      checkin_date TEXT NOT NULL,
      streak INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, checkin_date)
    )
  `);

  // 创建关注表
  db.run(`
    CREATE TABLE IF NOT EXISTS follows (
      id TEXT PRIMARY KEY,
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(follower_id, following_id)
    )
  `);

  // 创建通知表
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      data TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建系列表
  db.run(`
    CREATE TABLE IF NOT EXISTS series (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      cover TEXT DEFAULT '📚',
      is_public INTEGER DEFAULT 1,
      memories_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建系列-记忆关联表
  db.run(`
    CREATE TABLE IF NOT EXISTS series_memories (
      id TEXT PRIMARY KEY,
      series_id TEXT NOT NULL,
      memory_id TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(series_id, memory_id)
    )
  `);

  // 创建举报表
  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  saveDB();
}

// Save database to file
function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, buffer);
}

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '未授权访问' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token无效或已过期' });
  }
};

// Optional auth middleware - 不会阻止请求，但如果提供了token则解析用户信息
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Token无效，但不阻止请求
      req.user = null;
    }
  }
  next();
};

// Helper functions for sql.js (since it doesn't have parameterized queries like better-sqlite3)
function runQuery(sql, params = []) {
  db.run(sql, params);
  saveDB();
}

function getOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function getAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// ============ Auth Routes ============

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: '用户名、邮箱和密码都是必填项' });
  }

  try {
    const existingUser = getOne('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已被注册' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    runQuery('INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)', [userId, username, email, passwordHash]);

    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: '注册成功',
      user: { id: userId, username, email, avatar: '🦞' },
      token
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码都是必填项' });
  }

  try {
    const user = getOne('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: '登录成功',
      user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar },
      token
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = getOne('SELECT id, username, email, avatar, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json(user);
});

// ============ Memory Routes ============

// ============ Search Routes ============

// Search memories
app.get('/api/memories/search', (req, res) => {
  const { q } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const userId = req.user?.id;

  if (!q || q.trim() === '') {
    return res.status(400).json({ error: '搜索关键词不能为空' });
  }

  const searchTerm = `%${q.trim()}%`;

  try {
    let memories;
    let total;

    if (userId) {
      // 已登录：搜索公开的 + 自己的 + 关注者的 followers 可见
      memories = getAll(`
        SELECT m.*, u.username, u.avatar,
          EXISTS(SELECT 1 FROM likes WHERE user_id = ? AND memory_id = m.id) as is_liked,
          EXISTS(SELECT 1 FROM bookmarks WHERE user_id = ? AND memory_id = m.id) as is_bookmarked
        FROM memories m
        JOIN users u ON m.user_id = u.id
        LEFT JOIN follows f ON m.user_id = f.following_id AND f.follower_id = ?
        WHERE (m.title LIKE ? OR m.content LIKE ? OR m.tags LIKE ?)
          AND (m.visibility = 'public' OR m.user_id = ? OR (m.visibility = 'followers' AND f.id IS NOT NULL))
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `, [userId, userId, userId, searchTerm, searchTerm, searchTerm, userId, limit, offset]);
      const totalResult = getOne(`
        SELECT COUNT(*) as count FROM memories m
        LEFT JOIN follows f ON m.user_id = f.following_id AND f.follower_id = ?
        WHERE (m.title LIKE ? OR m.content LIKE ? OR m.tags LIKE ?)
          AND (m.visibility = 'public' OR m.user_id = ? OR (m.visibility = 'followers' AND f.id IS NOT NULL))
      `, [userId, searchTerm, searchTerm, searchTerm, userId]);
      total = totalResult.count;
    } else {
      // 未登录：只能搜索公开的记忆
      memories = getAll(`
        SELECT m.*, u.username, u.avatar
        FROM memories m
        JOIN users u ON m.user_id = u.id
        WHERE (m.title LIKE ? OR m.content LIKE ? OR m.tags LIKE ?) AND m.visibility = 'public'
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `, [searchTerm, searchTerm, searchTerm, limit, offset]);
      memories = memories.map(m => ({ ...m, is_liked: false, is_bookmarked: false }));
      const totalResult = getOne("SELECT COUNT(*) as count FROM memories WHERE (title LIKE ? OR content LIKE ? OR tags LIKE ?) AND visibility = 'public'", [searchTerm, searchTerm, searchTerm]);
      total = totalResult.count;
    }

    res.json({
      memories,
      query: q,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('搜索错误:', error);
    res.status(500).json({ error: '搜索失败' });
  }
});

// Get popular tags (热门标签)
app.get('/api/tags/popular', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;

  try {
    // 获取所有记忆的标签
    const memories = getAll('SELECT tags FROM memories WHERE tags IS NOT NULL AND tags != ""');
    
    // 统计标签出现次数
    const tagCounts = {};
    memories.forEach(memory => {
      if (memory.tags) {
        memory.tags.split(',').forEach(tag => {
          const trimmedTag = tag.trim();
          if (trimmedTag) {
            tagCounts[trimmedTag] = (tagCounts[trimmedTag] || 0) + 1;
          }
        });
      }
    });

    // 排序并取前 N 个
    const popularTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));

    res.json({ tags: popularTags });
  } catch (error) {
    console.error('获取热门标签错误:', error);
    res.status(500).json({ error: '获取热门标签失败' });
  }
});

// Get random memory (随机回顾)
app.get('/api/memories/random', (req, res) => {
  const userId = req.user?.id;

  try {
    let memory;
    
    if (userId) {
      memory = getOne(`
        SELECT m.*, u.username, u.avatar,
          EXISTS(SELECT 1 FROM likes WHERE user_id = ? AND memory_id = m.id) as is_liked,
          EXISTS(SELECT 1 FROM bookmarks WHERE user_id = ? AND memory_id = m.id) as is_bookmarked
        FROM memories m
        JOIN users u ON m.user_id = u.id
        WHERE m.visibility = 'public'
        ORDER BY RANDOM()
        LIMIT 1
      `, [userId, userId]);
    } else {
      memory = getOne(`
        SELECT m.*, u.username, u.avatar
        FROM memories m
        JOIN users u ON m.user_id = u.id
        WHERE m.visibility = 'public'
        ORDER BY RANDOM()
        LIMIT 1
      `);
      if (memory) {
        memory.is_liked = false;
        memory.is_bookmarked = false;
      }
    }

    if (!memory) {
      return res.status(404).json({ error: '暂无记忆' });
    }

    res.json(memory);
  } catch (error) {
    console.error('获取随机记忆错误:', error);
    res.status(500).json({ error: '获取随机记忆失败' });
  }
});

// Get hot memories (热门记忆 - 按热度排序)
app.get('/api/memories/hot', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const userId = req.user?.id;

  try {
    let memories;
    let total;

    // 热度算法：likes * 3 + bookmarks * 2 + comments * 1
    // 加上时间衰减因子（7天内加权，超过7天逐渐衰减）
    // 只显示公开的记忆
    if (userId) {
      memories = getAll(`
        SELECT m.*, u.username, u.avatar,
          EXISTS(SELECT 1 FROM likes WHERE user_id = ? AND memory_id = m.id) as is_liked,
          EXISTS(SELECT 1 FROM bookmarks WHERE user_id = ? AND memory_id = m.id) as is_bookmarked,
          (
            (m.likes_count * 3 + m.bookmarks_count * 2 + m.comments_count * 1) *
            CASE 
              WHEN julianday('now') - julianday(m.created_at) <= 1 THEN 1.5
              WHEN julianday('now') - julianday(m.created_at) <= 3 THEN 1.3
              WHEN julianday('now') - julianday(m.created_at) <= 7 THEN 1.1
              WHEN julianday('now') - julianday(m.created_at) <= 30 THEN 1.0
              ELSE 0.8
            END
          ) as hot_score
        FROM memories m
        JOIN users u ON m.user_id = u.id
        WHERE m.visibility = 'public'
        ORDER BY hot_score DESC, m.created_at DESC
        LIMIT ? OFFSET ?
      `, [userId, userId, limit, offset]);
      const totalResult = getOne("SELECT COUNT(*) as count FROM memories WHERE visibility = 'public'");
      total = totalResult.count;
    } else {
      memories = getAll(`
        SELECT m.*, u.username, u.avatar,
          0 as is_liked,
          0 as is_bookmarked,
          (
            (m.likes_count * 3 + m.bookmarks_count * 2 + m.comments_count * 1) *
            CASE 
              WHEN julianday('now') - julianday(m.created_at) <= 1 THEN 1.5
              WHEN julianday('now') - julianday(m.created_at) <= 3 THEN 1.3
              WHEN julianday('now') - julianday(m.created_at) <= 7 THEN 1.1
              WHEN julianday('now') - julianday(m.created_at) <= 30 THEN 1.0
              ELSE 0.8
            END
          ) as hot_score
        FROM memories m
        JOIN users u ON m.user_id = u.id
        WHERE m.visibility = 'public'
        ORDER BY hot_score DESC, m.created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      memories = memories.map(m => ({ ...m, is_liked: false, is_bookmarked: false }));
      const totalResult = getOne("SELECT COUNT(*) as count FROM memories WHERE visibility = 'public'");
      total = totalResult.count;
    }

    res.json({
      memories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取热门记忆错误:', error);
    res.status(500).json({ error: '获取热门记忆失败' });
  }
});

// Get all memories (with pagination)
app.get('/api/memories', optionalAuth, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const userId = req.user?.id;

  try {
    let memories;
    let total;

    if (userId) {
      // 已登录用户：可以看到 public 的 + 自己的所有记忆 + 关注者的 followers 记忆
      memories = getAll(`
        SELECT m.*, u.username, u.avatar,
          EXISTS(SELECT 1 FROM likes WHERE user_id = ? AND memory_id = m.id) as is_liked,
          EXISTS(SELECT 1 FROM bookmarks WHERE user_id = ? AND memory_id = m.id) as is_bookmarked
        FROM memories m
        JOIN users u ON m.user_id = u.id
        LEFT JOIN follows f ON m.user_id = f.following_id AND f.follower_id = ?
        WHERE m.visibility = 'public' 
          OR m.user_id = ? 
          OR (m.visibility = 'followers' AND f.id IS NOT NULL)
        ORDER BY m.is_pinned DESC, m.created_at DESC
        LIMIT ? OFFSET ?
      `, [userId, userId, userId, userId, limit, offset]);
      const totalResult = getOne(`
        SELECT COUNT(*) as count FROM memories m
        LEFT JOIN follows f ON m.user_id = f.following_id AND f.follower_id = ?
        WHERE m.visibility = 'public' 
          OR m.user_id = ? 
          OR (m.visibility = 'followers' AND f.id IS NOT NULL)
      `, [userId, userId]);
      total = totalResult.count;
    } else {
      // 未登录用户：只能看到 public 的记忆
      memories = getAll(`
        SELECT m.*, u.username, u.avatar
        FROM memories m
        JOIN users u ON m.user_id = u.id
        WHERE m.visibility = 'public'
        ORDER BY m.is_pinned DESC, m.created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      memories = memories.map(m => ({ ...m, is_liked: false, is_bookmarked: false }));
      const totalResult = getOne("SELECT COUNT(*) as count FROM memories WHERE visibility = 'public'");
      total = totalResult.count;
    }

    res.json({
      memories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取记忆列表错误:', error);
    res.status(500).json({ error: '获取记忆列表失败' });
  }
});

// 获取关注的人的记忆（关注动态）- 必须在 /api/memories/:id 之前
app.get('/api/memories/following', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    // 获取关注用户的记忆（公开的 + 仅关注者可见的）
    const memories = getAll(`
      SELECT m.*, u.username, u.avatar,
        EXISTS(SELECT 1 FROM likes WHERE user_id = ? AND memory_id = m.id) as is_liked,
        EXISTS(SELECT 1 FROM bookmarks WHERE user_id = ? AND memory_id = m.id) as is_bookmarked
      FROM memories m
      JOIN users u ON m.user_id = u.id
      JOIN follows f ON m.user_id = f.following_id
      WHERE f.follower_id = ? AND (m.visibility = 'public' OR m.visibility = 'followers')
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, userId, userId, limit, offset]);

    const totalResult = getOne(`
      SELECT COUNT(*) as count 
      FROM memories m
      JOIN follows f ON m.user_id = f.following_id
      WHERE f.follower_id = ? AND (m.visibility = 'public' OR m.visibility = 'followers')
    `, [userId]);
    const total = totalResult?.count || 0;

    res.json({
      memories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取关注动态错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Get single memory
app.get('/api/memories/:id', optionalAuth, (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    let memory;
    if (userId) {
      memory = getOne(`
        SELECT m.*, u.username, u.avatar,
          EXISTS(SELECT 1 FROM likes WHERE user_id = ? AND memory_id = m.id) as is_liked,
          EXISTS(SELECT 1 FROM bookmarks WHERE user_id = ? AND memory_id = m.id) as is_bookmarked
        FROM memories m
        JOIN users u ON m.user_id = u.id
        WHERE m.id = ?
      `, [userId, userId, id]);
    } else {
      memory = getOne(`
        SELECT m.*, u.username, u.avatar
        FROM memories m
        JOIN users u ON m.user_id = u.id
        WHERE m.id = ?
      `, [id]);
      if (memory) {
        memory.is_liked = false;
        memory.is_bookmarked = false;
      }
    }

    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    // 检查访问权限
    const visibility = memory.visibility || 'public';
    if (visibility === 'private' && memory.user_id !== userId) {
      return res.status(403).json({ error: '这是一条私密记忆' });
    }
    if (visibility === 'followers' && memory.user_id !== userId) {
      if (!userId) {
        return res.status(403).json({ error: '请登录后查看' });
      }
      const isFollowing = getOne('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', [userId, memory.user_id]);
      if (!isFollowing) {
        return res.status(403).json({ error: '仅关注者可见' });
      }
    }

    // 增加阅读量
    runQuery('UPDATE memories SET views_count = COALESCE(views_count, 0) + 1 WHERE id = ?', [id]);
    memory.views_count = (memory.views_count || 0) + 1;

    // Get comments
    const comments = getAll(`
      SELECT c.*, u.username, u.avatar, 
        reply_to.reply_to_id as reply_to_comment_id,
        reply_user.username as reply_to_username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN comments reply_to ON c.reply_to_id = reply_to.id
      LEFT JOIN users reply_user ON reply_to.user_id = reply_user.id
      WHERE c.memory_id = ?
      ORDER BY c.created_at DESC
    `, [id]);

    res.json({ ...memory, comments });
  } catch (error) {
    console.error('获取记忆详情错误:', error);
    res.status(500).json({ error: '获取记忆详情失败' });
  }
});

// Create memory
app.post('/api/memories', authMiddleware, (req, res) => {
  const { title, content, tags, visibility } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: '标题和内容都是必填项' });
  }

  // 验证 visibility 值
  const validVisibility = ['public', 'private', 'followers'];
  const memoryVisibility = validVisibility.includes(visibility) ? visibility : 'public';

  try {
    const memoryId = uuidv4();
    const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');

    runQuery('INSERT INTO memories (id, user_id, title, content, tags, visibility) VALUES (?, ?, ?, ?, ?, ?)', [memoryId, req.user.id, title, content, tagsStr, memoryVisibility]);

    const memory = getOne(`
      SELECT m.*, u.username, u.avatar
      FROM memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `, [memoryId]);

    res.status(201).json({ message: '记忆创建成功', memory });
  } catch (error) {
    console.error('创建记忆错误:', error);
    res.status(500).json({ error: '创建记忆失败' });
  }
});

// Update memory
app.put('/api/memories/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { title, content, tags, visibility } = req.body;

  try {
    const memory = getOne('SELECT * FROM memories WHERE id = ?', [id]);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    if (memory.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权修改此记忆' });
    }

    // 验证 visibility 值
    const validVisibility = ['public', 'private', 'followers'];
    const newVisibility = validVisibility.includes(visibility) ? visibility : memory.visibility;

    const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');
    runQuery('UPDATE memories SET title = ?, content = ?, tags = ?, visibility = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [title || memory.title, content || memory.content, tagsStr, newVisibility, id]);

    const updatedMemory = getOne(`
      SELECT m.*, u.username, u.avatar
      FROM memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `, [id]);

    res.json({ message: '记忆更新成功', memory: updatedMemory });
  } catch (error) {
    console.error('更新记忆错误:', error);
    res.status(500).json({ error: '更新记忆失败' });
  }
});

// Delete memory
app.delete('/api/memories/:id', authMiddleware, (req, res) => {
  const { id } = req.params;

  try {
    const memory = getOne('SELECT * FROM memories WHERE id = ?', [id]);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    if (memory.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权删除此记忆' });
    }

    // Delete related data
    runQuery('DELETE FROM likes WHERE memory_id = ?', [id]);
    runQuery('DELETE FROM bookmarks WHERE memory_id = ?', [id]);
    runQuery('DELETE FROM comments WHERE memory_id = ?', [id]);
    runQuery('DELETE FROM memories WHERE id = ?', [id]);

    res.json({ message: '记忆删除成功' });
  } catch (error) {
    console.error('删除记忆错误:', error);
    res.status(500).json({ error: '删除记忆失败' });
  }
});

// ============ Like Routes ============

// Toggle like
app.post('/api/memories/:id/like', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const existingLike = getOne('SELECT * FROM likes WHERE user_id = ? AND memory_id = ?', [userId, id]);
    
    if (existingLike) {
      // Unlike
      runQuery('DELETE FROM likes WHERE id = ?', [existingLike.id]);
      runQuery('UPDATE memories SET likes_count = likes_count - 1 WHERE id = ?', [id]);
      res.json({ liked: false, message: '取消点赞' });
    } else {
      // Like
      runQuery('INSERT INTO likes (id, user_id, memory_id) VALUES (?, ?, ?)', [uuidv4(), userId, id]);
      runQuery('UPDATE memories SET likes_count = likes_count + 1 WHERE id = ?', [id]);
      
      // 创建通知
      const memory = getOne('SELECT m.title, m.user_id, u.username FROM memories m JOIN users u ON m.user_id = u.id WHERE m.id = ?', [id]);
      const liker = getOne('SELECT username FROM users WHERE id = ?', [userId]);
      if (memory && memory.user_id !== userId) {
        createNotification(
          memory.user_id,
          'like',
          '收到新的点赞',
          `${liker?.username || '有人'} 赞了你的记忆《${memory.title}》`,
          { memoryId: id, type: 'like' }
        );
      }
      
      res.json({ liked: true, message: '点赞成功' });
    }
  } catch (error) {
    console.error('点赞操作错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// ============ Bookmark Routes ============

// Toggle bookmark
app.post('/api/memories/:id/bookmark', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const existingBookmark = getOne('SELECT * FROM bookmarks WHERE user_id = ? AND memory_id = ?', [userId, id]);
    
    if (existingBookmark) {
      // Remove bookmark
      runQuery('DELETE FROM bookmarks WHERE id = ?', [existingBookmark.id]);
      runQuery('UPDATE memories SET bookmarks_count = bookmarks_count - 1 WHERE id = ?', [id]);
      res.json({ bookmarked: false, message: '取消收藏' });
    } else {
      // Add bookmark
      runQuery('INSERT INTO bookmarks (id, user_id, memory_id) VALUES (?, ?, ?)', [uuidv4(), userId, id]);
      runQuery('UPDATE memories SET bookmarks_count = bookmarks_count + 1 WHERE id = ?', [id]);
      
      // 创建通知
      const memory = getOne('SELECT m.title, m.user_id, u.username FROM memories m JOIN users u ON m.user_id = u.id WHERE m.id = ?', [id]);
      const bookmarker = getOne('SELECT username FROM users WHERE id = ?', [userId]);
      if (memory && memory.user_id !== userId) {
        createNotification(
          memory.user_id,
          'bookmark',
          '收到新的收藏',
          `${bookmarker?.username || '有人'} 收藏了你的记忆《${memory.title}》`,
          { memoryId: id, type: 'bookmark' }
        );
      }
      
      res.json({ bookmarked: true, message: '收藏成功' });
    }
  } catch (error) {
    console.error('收藏操作错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// Get user's bookmarks
app.get('/api/user/bookmarks', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    const bookmarks = getAll(`
      SELECT m.*, u.username, u.avatar
      FROM bookmarks b
      JOIN memories m ON b.memory_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `, [userId]);

    res.json(bookmarks);
  } catch (error) {
    console.error('获取收藏列表错误:', error);
    res.status(500).json({ error: '获取收藏列表失败' });
  }
});

// ============ Comment Routes ============

// Add comment
app.post('/api/memories/:id/comments', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { content, replyToId } = req.body;

  if (!content) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }

  try {
    const commentId = uuidv4();
    runQuery('INSERT INTO comments (id, user_id, memory_id, content, reply_to_id) VALUES (?, ?, ?, ?, ?)', 
      [commentId, req.user.id, id, content, replyToId || null]);
    runQuery('UPDATE memories SET comments_count = comments_count + 1 WHERE id = ?', [id]);

    // 创建评论通知
    const memory = getOne('SELECT m.title, m.user_id FROM memories m WHERE m.id = ?', [id]);
    const commenter = getOne('SELECT username FROM users WHERE id = ?', [req.user.id]);
    
    // 如果是回复评论，通知被回复的用户
    let notifyUserId = memory?.user_id;
    let notifyContent = `${commenter?.username || '有人'} 评论了你的记忆《${memory?.title}》`;
    
    if (replyToId) {
      const replyToComment = getOne('SELECT c.user_id, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?', [replyToId]);
      if (replyToComment && replyToComment.user_id !== req.user.id) {
        notifyUserId = replyToComment.user_id;
        notifyContent = `${commenter?.username || '有人'} 回复了你在《${memory?.title}》中的评论`;
      }
    }
    
    if (memory && notifyUserId !== req.user.id) {
      createNotification(
        notifyUserId,
        'comment',
        '收到新的评论',
        notifyContent,
        { memoryId: id, commentId, type: replyToId ? 'reply' : 'comment' }
      );
    }

    const comment = getOne(`
      SELECT c.*, u.username, u.avatar, 
        reply_to.reply_to_id as reply_to_comment_id,
        reply_user.username as reply_to_username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN comments reply_to ON c.reply_to_id = reply_to.id
      LEFT JOIN users reply_user ON reply_to.user_id = reply_user.id
      WHERE c.id = ?
    `, [commentId]);

    res.status(201).json({ message: '评论成功', comment });
  } catch (error) {
    console.error('添加评论错误:', error);
    res.status(500).json({ error: '评论失败' });
  }
});

// Delete comment
app.delete('/api/memories/:memoryId/comments/:commentId', authMiddleware, (req, res) => {
  const { memoryId, commentId } = req.params;

  try {
    const comment = getOne('SELECT * FROM comments WHERE id = ?', [commentId]);
    if (!comment) {
      return res.status(404).json({ error: '评论不存在' });
    }

    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权删除此评论' });
    }

    runQuery('DELETE FROM comments WHERE id = ?', [commentId]);
    runQuery('UPDATE memories SET comments_count = comments_count - 1 WHERE id = ?', [memoryId]);

    res.json({ message: '评论删除成功' });
  } catch (error) {
    console.error('删除评论错误:', error);
    res.status(500).json({ error: '删除评论失败' });
  }
});

// ============ User Routes ============

// Get user's memories
app.get('/api/user/memories', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    // 置顶的记忆排在前面
    const memories = getAll(`
      SELECT m.*, u.username, u.avatar
      FROM memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = ?
      ORDER BY m.is_pinned DESC, m.created_at DESC
    `, [userId]);

    res.json(memories);
  } catch (error) {
    console.error('获取用户记忆错误:', error);
    res.status(500).json({ error: '获取用户记忆失败' });
  }
});

// Export user's memories as Markdown
app.get('/api/user/export', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const format = req.query.format || 'markdown';

  try {
    const user = getOne('SELECT username FROM users WHERE id = ?', [userId]);
    const memories = getAll(`
      SELECT m.*, u.username, u.avatar
      FROM memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = ?
      ORDER BY m.created_at DESC
    `, [userId]);

    if (memories.length === 0) {
      return res.status(400).json({ error: '暂无记忆可导出' });
    }

    if (format === 'json') {
      // Export as JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="memories-${user.username}-${new Date().toISOString().split('T')[0]}.json"`);
      return res.json({
        exportedAt: new Date().toISOString(),
        user: user.username,
        totalMemories: memories.length,
        memories: memories.map(m => ({
          id: m.id,
          title: m.title,
          content: m.content,
          tags: m.tags ? m.tags.split(',').filter(Boolean) : [],
          likes_count: m.likes_count,
          bookmarks_count: m.bookmarks_count,
          comments_count: m.comments_count,
          created_at: m.created_at,
          updated_at: m.updated_at
        }))
      });
    }

    // Export as Markdown (default)
    let markdown = `# 🦞 ${user.username} 的记忆导出\n\n`;
    markdown += `> 导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
    markdown += `> 共计 ${memories.length} 条记忆\n\n`;
    markdown += `---\n\n`;

    memories.forEach((memory, index) => {
      markdown += `## ${index + 1}. ${memory.title}\n\n`;
      markdown += `**创建时间**: ${new Date(memory.created_at).toLocaleString('zh-CN')}\n`;
      if (memory.updated_at !== memory.created_at) {
        markdown += `**更新时间**: ${new Date(memory.updated_at).toLocaleString('zh-CN')}\n`;
      }
      if (memory.tags) {
        const tags = memory.tags.split(',').filter(Boolean);
        if (tags.length > 0) {
          markdown += `**标签**: ${tags.map(t => '#' + t).join(' ')}\n`;
        }
      }
      markdown += `**互动**: 👍 ${memory.likes_count || 0} | 🔖 ${memory.bookmarks_count || 0} | 💬 ${memory.comments_count || 0}\n\n`;
      markdown += `### 内容\n\n${memory.content}\n\n`;
      markdown += `---\n\n`;
    });

    markdown += `\n*由 OpenClaw Memory Share 导出*\n`;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="memories-${user.username}-${new Date().toISOString().split('T')[0]}.md"`);
    res.send(markdown);
  } catch (error) {
    console.error('导出记忆错误:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

// Update user profile
app.put('/api/user/profile', authMiddleware, (req, res) => {
  const { avatar } = req.body;
  const userId = req.user.id;

  try {
    runQuery('UPDATE users SET avatar = ? WHERE id = ?', [avatar, userId]);
    const user = getOne('SELECT id, username, email, avatar, created_at FROM users WHERE id = ?', [userId]);
    res.json({ message: '资料更新成功', user });
  } catch (error) {
    console.error('更新资料错误:', error);
    res.status(500).json({ error: '更新资料失败' });
  }
});

// Change password (用户修改自己的密码)
app.put('/api/user/password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '旧密码和新密码都是必填项' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少需要6个字符' });
  }

  try {
    const user = getOne('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const isValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: '旧密码错误' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    runQuery('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, userId]);

    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

// Admin reset password (管理员重置密码)
app.post('/api/admin/reset-password', async (req, res) => {
  const { adminKey, username, newPassword } = req.body;

  // 验证管理员密钥
  const ADMIN_KEY = process.env.ADMIN_KEY || 'openclaw-admin-2024';
  if (adminKey !== ADMIN_KEY) {
    return res.status(403).json({ error: '无权限' });
  }

  if (!username || !newPassword) {
    return res.status(400).json({ error: '用户名和新密码都是必填项' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少需要6个字符' });
  }

  try {
    const user = getOne('SELECT id FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    runQuery('UPDATE users SET password_hash = ? WHERE username = ?', [newPasswordHash, username]);

    res.json({ message: '密码重置成功', username });
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({ error: '重置密码失败' });
  }
});

// Get user statistics
app.get('/api/user/stats', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    // Get user info
    const user = getOne('SELECT created_at FROM users WHERE id = ?', [userId]);
    
    // Calculate days since joined
    const joinedDate = new Date(user.created_at);
    const now = new Date();
    const daysJoined = Math.floor((now - joinedDate) / (1000 * 60 * 60 * 24)) + 1;

    // Get memories count and stats
    const memories = getAll('SELECT * FROM memories WHERE user_id = ?', [userId]);
    const memoriesCount = memories.length;
    
    // Total likes and bookmarks received
    const totalLikes = memories.reduce((sum, m) => sum + (m.likes_count || 0), 0);
    const totalBookmarks = memories.reduce((sum, m) => sum + (m.bookmarks_count || 0), 0);
    const totalComments = memories.reduce((sum, m) => sum + (m.comments_count || 0), 0);

    // Get bookmarks count (how many the user has bookmarked)
    const bookmarksCount = getOne('SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ?', [userId])?.count || 0;

    // Get likes count (how many the user has liked)
    const likesCount = getOne('SELECT COUNT(*) as count FROM likes WHERE user_id = ?', [userId])?.count || 0;

    // Get comments count (how many the user has commented)
    const commentsMadeCount = getOne('SELECT COUNT(*) as count FROM comments WHERE user_id = ?', [userId])?.count || 0;

    // Extract and count tags
    const tagCounts = {};
    memories.forEach(m => {
      if (m.tags) {
        m.tags.split(',').forEach(tag => {
          const trimmedTag = tag.trim();
          if (trimmedTag) {
            tagCounts[trimmedTag] = (tagCounts[trimmedTag] || 0) + 1;
          }
        });
      }
    });
    
    // Sort tags by count and get top 5
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Most popular memory (by likes)
    const mostPopularMemory = memories.length > 0 
      ? memories.reduce((max, m) => (m.likes_count || 0) > (max.likes_count || 0) ? m : max, memories[0])
      : null;

    // Average stats per memory
    const avgLikes = memoriesCount > 0 ? (totalLikes / memoriesCount).toFixed(1) : 0;
    const avgBookmarks = memoriesCount > 0 ? (totalBookmarks / memoriesCount).toFixed(1) : 0;

    // Posting frequency (memories per week)
    const weeksJoined = Math.max(daysJoined / 7, 1);
    const postingFrequency = (memoriesCount / weeksJoined).toFixed(1);

    res.json({
      daysJoined,
      memoriesCount,
      totalLikes,
      totalBookmarks,
      totalComments,
      bookmarksCount,
      likesCount,
      commentsMadeCount,
      topTags,
      mostPopularMemory: mostPopularMemory ? {
        id: mostPopularMemory.id,
        title: mostPopularMemory.title,
        likes_count: mostPopularMemory.likes_count || 0
      } : null,
      avgLikes,
      avgBookmarks,
      postingFrequency
    });
  } catch (error) {
    console.error('获取用户统计错误:', error);
    res.status(500).json({ error: '获取用户统计失败' });
  }
});

// ============ Checkin Routes ============

// 用户签到
app.post('/api/user/checkin', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // 检查今天是否已签到
    const existingCheckin = getOne('SELECT * FROM sign_ins WHERE user_id = ? AND checkin_date = ?', [userId, today]);
    
    if (existingCheckin) {
      return res.status(400).json({ error: '今天已经签到了', alreadyCheckedIn: true });
    }

    // 检查昨天是否签到，计算连续签到天数
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const yesterdayCheckin = getOne('SELECT streak FROM sign_ins WHERE user_id = ? AND checkin_date = ?', [userId, yesterdayStr]);
    const streak = yesterdayCheckin ? (yesterdayCheckin.streak + 1) : 1;

    // 插入签到记录
    const checkinId = uuidv4();
    runQuery('INSERT INTO sign_ins (id, user_id, checkin_date, streak) VALUES (?, ?, ?, ?)', [checkinId, userId, today, streak]);

    // 获取总签到天数
    const totalCheckins = getOne('SELECT COUNT(*) as count FROM sign_ins WHERE user_id = ?', [userId])?.count || 0;

    res.json({
      message: '签到成功',
      checkin: {
        id: checkinId,
        checkin_date: today,
        streak,
        totalCheckins: totalCheckins + 1
      }
    });
  } catch (error) {
    console.error('签到错误:', error);
    res.status(500).json({ error: '签到失败' });
  }
});

// 获取签到状态
app.get('/api/user/checkin', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  try {
    // 检查今天是否已签到
    const todayCheckin = getOne('SELECT * FROM sign_ins WHERE user_id = ? AND checkin_date = ?', [userId, today]);
    
    // 获取当前连续签到天数
    const latestCheckin = getOne('SELECT streak, checkin_date FROM sign_ins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 1', [userId]);
    
    // 获取总签到天数
    const totalCheckins = getOne('SELECT COUNT(*) as count FROM sign_ins WHERE user_id = ?', [userId])?.count || 0;

    // 判断连续签到是否中断（如果最近签到不是今天也不是昨天，则中断）
    let currentStreak = 0;
    if (todayCheckin) {
      currentStreak = todayCheckin.streak;
    } else if (latestCheckin) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      if (latestCheckin.checkin_date === yesterdayStr) {
        currentStreak = latestCheckin.streak;
      }
    }

    // 获取最长连续签到天数
    const allCheckins = getAll('SELECT streak FROM sign_ins WHERE user_id = ? ORDER BY streak DESC', [userId]);
    const maxStreak = allCheckins.length > 0 ? Math.max(...allCheckins.map(c => c.streak)) : 0;

    res.json({
      checkedInToday: !!todayCheckin,
      currentStreak,
      maxStreak,
      totalCheckins
    });
  } catch (error) {
    console.error('获取签到状态错误:', error);
    res.status(500).json({ error: '获取签到状态失败' });
  }
});

// 获取签到历史（最近30天）
app.get('/api/user/checkin/history', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const days = parseInt(req.query.days) || 30;

  try {
    const checkins = getAll(`
      SELECT checkin_date, streak 
      FROM sign_ins 
      WHERE user_id = ? 
      ORDER BY checkin_date DESC 
      LIMIT ?
    `, [userId, days]);

    res.json({ checkins });
  } catch (error) {
    console.error('获取签到历史错误:', error);
    res.status(500).json({ error: '获取签到历史失败' });
  }
});

// 获取签到排行榜（连续签到天数）
app.get('/api/checkin/leaderboard', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  try {
    // 获取每个用户最新的签到记录（按连续天数排序）
    const leaderboard = getAll(`
      SELECT s.user_id, s.streak, s.checkin_date, u.username, u.avatar
      FROM sign_ins s
      JOIN users u ON s.user_id = u.id
      WHERE s.id IN (
        SELECT id FROM sign_ins s2 
        WHERE s2.user_id = s.user_id 
        ORDER BY s2.checkin_date DESC 
        LIMIT 1
      )
      ORDER BY s.streak DESC, s.checkin_date DESC
      LIMIT ?
    `, [limit]);

    res.json({ leaderboard });
  } catch (error) {
    console.error('获取签到排行榜错误:', error);
    res.status(500).json({ error: '获取签到排行榜失败' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🦞 OpenClaw Memory Share API running on port ${PORT}`);
    console.log(`📚 API: http://localhost:${PORT}/api`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
});
// ============ Follow Routes ============

// 关注用户
app.post('/api/user/follow/:targetId', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const targetId = req.params.targetId;

  if (userId === targetId) {
    return res.status(400).json({ error: '不能关注自己' });
  }

  try {
    // 检查目标用户是否存在
    const targetUser = getOne('SELECT id FROM users WHERE id = ?', [targetId]);
    if (!targetUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 检查是否已关注
    const existingFollow = getOne('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?', [userId, targetId]);
    
    if (existingFollow) {
      // 取消关注
      runQuery('DELETE FROM follows WHERE id = ?', [existingFollow.id]);
      res.json({ following: false, message: '已取消关注' });
    } else {
      // 关注
      const followId = uuidv4();
      runQuery('INSERT INTO follows (id, follower_id, following_id) VALUES (?, ?, ?)', [followId, userId, targetId]);
      
      // 创建关注通知
      const follower = getOne('SELECT username FROM users WHERE id = ?', [userId]);
      createNotification(
        targetId,
        'follow',
        '有新粉丝关注了你',
        `${follower?.username || '有人'} 关注了你`,
        { followerId: userId, type: 'follow' }
      );
      
      res.json({ following: true, message: '关注成功' });
    }
  } catch (error) {
    console.error('关注操作错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// 检查是否关注某用户
app.get('/api/user/following/:targetId', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const targetId = req.params.targetId;

  try {
    const follow = getOne('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?', [userId, targetId]);
    res.json({ following: !!follow });
  } catch (error) {
    console.error('检查关注状态错误:', error);
    res.status(500).json({ error: '检查失败' });
  }
});

// 获取关注列表
app.get('/api/user/following', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    const following = getAll(`
      SELECT u.id, u.username, u.avatar
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
    `, [userId]);

    res.json({ following });
  } catch (error) {
    console.error('获取关注列表错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// 获取粉丝列表
app.get('/api/user/followers', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    const followers = getAll(`
      SELECT u.id, u.username, u.avatar
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
    `, [userId]);

    res.json({ followers });
  } catch (error) {
    console.error('获取粉丝列表错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// 获取用户关注统计
app.get('/api/user/follow-stats/:userId', (req, res) => {
  const userId = req.params.userId;

  try {
    const followingCount = getOne('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', [userId])?.count || 0;
    const followersCount = getOne('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [userId])?.count || 0;

    res.json({ followingCount, followersCount });
  } catch (error) {
    console.error('获取关注统计错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// ============ Pin Routes ============

// 置顶/取消置顶记忆
app.post('/api/memories/:id/pin', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const memory = getOne('SELECT * FROM memories WHERE id = ?', [id]);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    if (memory.user_id !== userId) {
      return res.status(403).json({ error: '无权操作此记忆' });
    }

    const newPinnedState = memory.is_pinned ? 0 : 1;
    runQuery('UPDATE memories SET is_pinned = ? WHERE id = ?', [newPinnedState, id]);

    res.json({ 
      pinned: newPinnedState === 1, 
      message: newPinnedState === 1 ? '已置顶' : '已取消置顶' 
    });
  } catch (error) {
    console.error('置顶操作错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// ============ Notification Routes ============

// 创建通知（内部函数）
function createNotification(userId, type, title, content, data = null) {
  try {
    const notificationId = uuidv4();
    runQuery(
      'INSERT INTO notifications (id, user_id, type, title, content, data) VALUES (?, ?, ?, ?, ?, ?)',
      [notificationId, userId, type, title, content, data ? JSON.stringify(data) : null]
    );
    return notificationId;
  } catch (error) {
    console.error('创建通知失败:', error);
    return null;
  }
}

// 获取通知列表
app.get('/api/notifications', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const notifications = getAll(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    const totalResult = getOne('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?', [userId]);
    const unreadResult = getOne('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);

    res.json({
      notifications: notifications.map(n => ({
        ...n,
        data: n.data ? JSON.parse(n.data) : null
      })),
      pagination: {
        page,
        limit,
        total: totalResult?.count || 0,
        totalPages: Math.ceil((totalResult?.count || 0) / limit)
      },
      unreadCount: unreadResult?.count || 0
    });
  } catch (error) {
    console.error('获取通知列表错误:', error);
    res.status(500).json({ error: '获取通知失败' });
  }
});

// 获取未读通知数量
app.get('/api/notifications/unread-count', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    const result = getOne('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
    res.json({ unreadCount: result?.count || 0 });
  } catch (error) {
    console.error('获取未读数量错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// 标记通知为已读
app.put('/api/notifications/:id/read', authMiddleware, (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;

  try {
    const notification = getOne('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [notificationId, userId]);
    if (!notification) {
      return res.status(404).json({ error: '通知不存在' });
    }

    runQuery('UPDATE notifications SET is_read = 1 WHERE id = ?', [notificationId]);
    res.json({ message: '已标记为已读' });
  } catch (error) {
    console.error('标记已读错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// 标记所有通知为已读
app.put('/api/notifications/read-all', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    runQuery('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
    res.json({ message: '已全部标记为已读' });
  } catch (error) {
    console.error('标记全部已读错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// 删除通知
app.delete('/api/notifications/:id', authMiddleware, (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;

  try {
    const notification = getOne('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [notificationId, userId]);
    if (!notification) {
      return res.status(404).json({ error: '通知不存在' });
    }

    runQuery('DELETE FROM notifications WHERE id = ?', [notificationId]);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除通知错误:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

// ============ Series Routes ============

// 创建系列
app.post('/api/series', authMiddleware, (req, res) => {
  const { title, description, cover, isPublic } = req.body;
  const userId = req.user.id;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: '系列标题不能为空' });
  }

  try {
    const seriesId = uuidv4();
    runQuery(
      'INSERT INTO series (id, user_id, title, description, cover, is_public) VALUES (?, ?, ?, ?, ?, ?)',
      [seriesId, userId, title.trim(), description || '', cover || '📚', isPublic !== false ? 1 : 0]
    );

    const series = getOne(`
      SELECT s.*, u.username, u.avatar
      FROM series s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `, [seriesId]);

    res.status(201).json({ message: '系列创建成功', series });
  } catch (error) {
    console.error('创建系列错误:', error);
    res.status(500).json({ error: '创建系列失败' });
  }
});

// 获取用户的系列列表
app.get('/api/user/series', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    const series = getAll(`
      SELECT s.*, u.username, u.avatar
      FROM series s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = ?
      ORDER BY s.updated_at DESC
    `, [userId]);

    res.json({ series });
  } catch (error) {
    console.error('获取系列列表错误:', error);
    res.status(500).json({ error: '获取系列列表失败' });
  }
});

// 获取某用户的公开系列（他人查看）
app.get('/api/users/:userId/series', (req, res) => {
  const targetUserId = req.params.userId;
  const currentUserId = req.user?.id;

  try {
    let series;
    if (currentUserId === targetUserId) {
      // 查看自己的系列，显示全部
      series = getAll(`
        SELECT s.*, u.username, u.avatar
        FROM series s
        JOIN users u ON s.user_id = u.id
        WHERE s.user_id = ?
        ORDER BY s.updated_at DESC
      `, [targetUserId]);
    } else {
      // 查看他人系列，只显示公开的
      series = getAll(`
        SELECT s.*, u.username, u.avatar
        FROM series s
        JOIN users u ON s.user_id = u.id
        WHERE s.user_id = ? AND s.is_public = 1
        ORDER BY s.updated_at DESC
      `, [targetUserId]);
    }

    res.json({ series });
  } catch (error) {
    console.error('获取用户系列错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// 获取热门系列（按记忆数和更新时间排序）- 必须在 /api/series/:id 之前
app.get('/api/series/hot', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  try {
    const series = getAll(`
      SELECT s.*, u.username, u.avatar
      FROM series s
      JOIN users u ON s.user_id = u.id
      WHERE s.is_public = 1 AND s.memories_count > 0
      ORDER BY s.memories_count DESC, s.updated_at DESC
      LIMIT ?
    `, [limit]);

    res.json({ series });
  } catch (error) {
    console.error('获取热门系列错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// 获取系列详情
app.get('/api/series/:id', (req, res) => {
  const seriesId = req.params.id;
  const userId = req.user?.id;

  try {
    const series = getOne(`
      SELECT s.*, u.username, u.avatar
      FROM series s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `, [seriesId]);

    if (!series) {
      return res.status(404).json({ error: '系列不存在' });
    }

    // 检查权限：非公开系列只有作者可以查看
    if (!series.is_public && series.user_id !== userId) {
      return res.status(403).json({ error: '无权查看此系列' });
    }

    // 获取系列内的记忆
    const memories = getAll(`
      SELECT m.*, u.username, u.avatar, sm.sort_order,
        EXISTS(SELECT 1 FROM likes WHERE user_id = ? AND memory_id = m.id) as is_liked,
        EXISTS(SELECT 1 FROM bookmarks WHERE user_id = ? AND memory_id = m.id) as is_bookmarked
      FROM series_memories sm
      JOIN memories m ON sm.memory_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE sm.series_id = ?
      ORDER BY sm.sort_order ASC, sm.added_at DESC
    `, [userId || '', userId || '', seriesId]);

    res.json({ ...series, memories });
  } catch (error) {
    console.error('获取系列详情错误:', error);
    res.status(500).json({ error: '获取系列详情失败' });
  }
});

// 更新系列
app.put('/api/series/:id', authMiddleware, (req, res) => {
  const seriesId = req.params.id;
  const { title, description, cover, isPublic } = req.body;
  const userId = req.user.id;

  try {
    const series = getOne('SELECT * FROM series WHERE id = ?', [seriesId]);
    if (!series) {
      return res.status(404).json({ error: '系列不存在' });
    }

    if (series.user_id !== userId) {
      return res.status(403).json({ error: '无权修改此系列' });
    }

    runQuery(
      'UPDATE series SET title = ?, description = ?, cover = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title?.trim() || series.title, description ?? series.description, cover || series.cover, isPublic !== undefined ? (isPublic ? 1 : 0) : series.is_public, seriesId]
    );

    const updatedSeries = getOne(`
      SELECT s.*, u.username, u.avatar
      FROM series s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `, [seriesId]);

    res.json({ message: '系列更新成功', series: updatedSeries });
  } catch (error) {
    console.error('更新系列错误:', error);
    res.status(500).json({ error: '更新系列失败' });
  }
});

// 删除系列
app.delete('/api/series/:id', authMiddleware, (req, res) => {
  const seriesId = req.params.id;
  const userId = req.user.id;

  try {
    const series = getOne('SELECT * FROM series WHERE id = ?', [seriesId]);
    if (!series) {
      return res.status(404).json({ error: '系列不存在' });
    }

    if (series.user_id !== userId) {
      return res.status(403).json({ error: '无权删除此系列' });
    }

    // 删除系列-记忆关联
    runQuery('DELETE FROM series_memories WHERE series_id = ?', [seriesId]);
    // 删除系列
    runQuery('DELETE FROM series WHERE id = ?', [seriesId]);

    res.json({ message: '系列删除成功' });
  } catch (error) {
    console.error('删除系列错误:', error);
    res.status(500).json({ error: '删除系列失败' });
  }
});

// 添加记忆到系列
app.post('/api/series/:id/memories', authMiddleware, (req, res) => {
  const seriesId = req.params.id;
  const { memoryId, sortOrder } = req.body;
  const userId = req.user.id;

  if (!memoryId) {
    return res.status(400).json({ error: '记忆ID不能为空' });
  }

  try {
    const series = getOne('SELECT * FROM series WHERE id = ?', [seriesId]);
    if (!series) {
      return res.status(404).json({ error: '系列不存在' });
    }

    if (series.user_id !== userId) {
      return res.status(403).json({ error: '无权操作此系列' });
    }

    // 检查记忆是否存在
    const memory = getOne('SELECT * FROM memories WHERE id = ?', [memoryId]);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    // 检查是否已添加
    const existing = getOne('SELECT * FROM series_memories WHERE series_id = ? AND memory_id = ?', [seriesId, memoryId]);
    if (existing) {
      return res.status(400).json({ error: '该记忆已在系列中' });
    }

    // 获取当前最大排序号
    const maxOrder = getOne('SELECT MAX(sort_order) as max_order FROM series_memories WHERE series_id = ?', [seriesId]);
    const newOrder = sortOrder !== undefined ? sortOrder : (maxOrder?.max_order || 0) + 1;

    const smId = uuidv4();
    runQuery(
      'INSERT INTO series_memories (id, series_id, memory_id, sort_order) VALUES (?, ?, ?, ?)',
      [smId, seriesId, memoryId, newOrder]
    );

    // 更新系列的记忆数量和更新时间
    runQuery('UPDATE series SET memories_count = memories_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [seriesId]);

    res.json({ message: '记忆已添加到系列', sortOrder: newOrder });
  } catch (error) {
    console.error('添加记忆到系列错误:', error);
    res.status(500).json({ error: '添加失败' });
  }
});

// 从系列中移除记忆
app.delete('/api/series/:seriesId/memories/:memoryId', authMiddleware, (req, res) => {
  const { seriesId, memoryId } = req.params;
  const userId = req.user.id;

  try {
    const series = getOne('SELECT * FROM series WHERE id = ?', [seriesId]);
    if (!series) {
      return res.status(404).json({ error: '系列不存在' });
    }

    if (series.user_id !== userId) {
      return res.status(403).json({ error: '无权操作此系列' });
    }

    const sm = getOne('SELECT * FROM series_memories WHERE series_id = ? AND memory_id = ?', [seriesId, memoryId]);
    if (!sm) {
      return res.status(404).json({ error: '该记忆不在系列中' });
    }

    runQuery('DELETE FROM series_memories WHERE series_id = ? AND memory_id = ?', [seriesId, memoryId]);
    runQuery('UPDATE series SET memories_count = memories_count - 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [seriesId]);

    res.json({ message: '记忆已从系列中移除' });
  } catch (error) {
    console.error('移除记忆错误:', error);
    res.status(500).json({ error: '移除失败' });
  }
});

// 更新系列内记忆的排序
app.put('/api/series/:id/order', authMiddleware, (req, res) => {
  const seriesId = req.params.id;
  const { orders } = req.body; // [{ memoryId: 'xxx', sortOrder: 1 }, ...]
  const userId = req.user.id;

  if (!orders || !Array.isArray(orders)) {
    return res.status(400).json({ error: '排序数据无效' });
  }

  try {
    const series = getOne('SELECT * FROM series WHERE id = ?', [seriesId]);
    if (!series) {
      return res.status(404).json({ error: '系列不存在' });
    }

    if (series.user_id !== userId) {
      return res.status(403).json({ error: '无权操作此系列' });
    }

    // 批量更新排序
    orders.forEach(item => {
      runQuery('UPDATE series_memories SET sort_order = ? WHERE series_id = ? AND memory_id = ?', [item.sortOrder, seriesId, item.memoryId]);
    });

    runQuery('UPDATE series SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [seriesId]);

    res.json({ message: '排序更新成功' });
  } catch (error) {
    console.error('更新排序错误:', error);
    res.status(500).json({ error: '更新排序失败' });
  }
});

// 获取记忆所属的系列
app.get('/api/memories/:id/series', (req, res) => {
  const memoryId = req.params.id;

  try {
    const series = getAll(`
      SELECT s.*, u.username, u.avatar
      FROM series_memories sm
      JOIN series s ON sm.series_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE sm.memory_id = ? AND s.is_public = 1
      ORDER BY s.updated_at DESC
    `, [memoryId]);

    res.json({ series });
  } catch (error) {
    console.error('获取记忆所属系列错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// ============ Report Routes ============

// 举报内容
app.post('/api/reports', authMiddleware, (req, res) => {
  const { targetType, targetId, reason, description } = req.body;
  const reporterId = req.user.id;

  if (!targetType || !targetId || !reason) {
    return res.status(400).json({ error: '请填写完整的举报信息' });
  }

  if (!['memory', 'comment', 'user'].includes(targetType)) {
    return res.status(400).json({ error: '无效的举报类型' });
  }

  try {
    // 检查目标是否存在
    let targetExists = false;
    if (targetType === 'memory') {
      targetExists = !!getOne('SELECT id FROM memories WHERE id = ?', [targetId]);
    } else if (targetType === 'comment') {
      targetExists = !!getOne('SELECT id FROM comments WHERE id = ?', [targetId]);
    } else if (targetType === 'user') {
      targetExists = !!getOne('SELECT id FROM users WHERE id = ?', [targetId]);
    }

    if (!targetExists) {
      return res.status(404).json({ error: '举报目标不存在' });
    }

    // 检查是否已举报过
    const existingReport = getOne(
      'SELECT * FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ?',
      [reporterId, targetType, targetId]
    );

    if (existingReport) {
      return res.status(400).json({ error: '您已举报过此内容' });
    }

    // 创建举报
    const reportId = uuidv4();
    runQuery(
      'INSERT INTO reports (id, reporter_id, target_type, target_id, reason, description) VALUES (?, ?, ?, ?, ?, ?)',
      [reportId, reporterId, targetType, targetId, reason, description || null]
    );

    res.status(201).json({ message: '举报已提交，我们会尽快处理', reportId });
  } catch (error) {
    console.error('举报错误:', error);
    res.status(500).json({ error: '举报失败' });
  }
});

// 获取举报列表（管理员功能，暂时简化）
app.get('/api/reports', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const status = req.query.status || 'all';

  try {
    // 获取用户自己的举报记录
    let query = 'SELECT * FROM reports WHERE reporter_id = ?';
    const params = [userId];

    if (status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const reports = getAll(query, params);

    res.json({ reports });
  } catch (error) {
    console.error('获取举报列表错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});
