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
      memories = getAll(`
        SELECT m.*, u.username, u.avatar,
          EXISTS(SELECT 1 FROM likes WHERE user_id = ? AND memory_id = m.id) as is_liked,
          EXISTS(SELECT 1 FROM bookmarks WHERE user_id = ? AND memory_id = m.id) as is_bookmarked
        FROM memories m
        JOIN users u ON m.user_id = u.id
        WHERE m.title LIKE ? OR m.content LIKE ? OR m.tags LIKE ?
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `, [userId, userId, searchTerm, searchTerm, searchTerm, limit, offset]);
      const totalResult = getOne('SELECT COUNT(*) as count FROM memories WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?', [searchTerm, searchTerm, searchTerm]);
      total = totalResult.count;
    } else {
      memories = getAll(`
        SELECT m.*, u.username, u.avatar
        FROM memories m
        JOIN users u ON m.user_id = u.id
        WHERE m.title LIKE ? OR m.content LIKE ? OR m.tags LIKE ?
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `, [searchTerm, searchTerm, searchTerm, limit, offset]);
      memories = memories.map(m => ({ ...m, is_liked: false, is_bookmarked: false }));
      const totalResult = getOne('SELECT COUNT(*) as count FROM memories WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?', [searchTerm, searchTerm, searchTerm]);
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
        ORDER BY RANDOM()
        LIMIT 1
      `, [userId, userId]);
    } else {
      memory = getOne(`
        SELECT m.*, u.username, u.avatar
        FROM memories m
        JOIN users u ON m.user_id = u.id
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
        ORDER BY hot_score DESC, m.created_at DESC
        LIMIT ? OFFSET ?
      `, [userId, userId, limit, offset]);
      const totalResult = getOne('SELECT COUNT(*) as count FROM memories');
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
        ORDER BY hot_score DESC, m.created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      memories = memories.map(m => ({ ...m, is_liked: false, is_bookmarked: false }));
      const totalResult = getOne('SELECT COUNT(*) as count FROM memories');
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
app.get('/api/memories', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const userId = req.user?.id;

  try {
    let memories;
    let total;

    if (userId) {
      memories = getAll(`
        SELECT m.*, u.username, u.avatar,
          EXISTS(SELECT 1 FROM likes WHERE user_id = ? AND memory_id = m.id) as is_liked,
          EXISTS(SELECT 1 FROM bookmarks WHERE user_id = ? AND memory_id = m.id) as is_bookmarked
        FROM memories m
        JOIN users u ON m.user_id = u.id
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `, [userId, userId, limit, offset]);
      const totalResult = getOne('SELECT COUNT(*) as count FROM memories');
      total = totalResult.count;
    } else {
      memories = getAll(`
        SELECT m.*, u.username, u.avatar
        FROM memories m
        JOIN users u ON m.user_id = u.id
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      memories = memories.map(m => ({ ...m, is_liked: false, is_bookmarked: false }));
      const totalResult = getOne('SELECT COUNT(*) as count FROM memories');
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

// Get single memory
app.get('/api/memories/:id', (req, res) => {
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

    // 增加阅读量
    runQuery('UPDATE memories SET views_count = COALESCE(views_count, 0) + 1 WHERE id = ?', [id]);
    memory.views_count = (memory.views_count || 0) + 1;

    // Get comments
    const comments = getAll(`
      SELECT c.*, u.username, u.avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
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
  const { title, content, tags } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: '标题和内容都是必填项' });
  }

  try {
    const memoryId = uuidv4();
    const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');

    runQuery('INSERT INTO memories (id, user_id, title, content, tags) VALUES (?, ?, ?, ?, ?)', [memoryId, req.user.id, title, content, tagsStr]);

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
  const { title, content, tags } = req.body;

  try {
    const memory = getOne('SELECT * FROM memories WHERE id = ?', [id]);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    if (memory.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权修改此记忆' });
    }

    const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');
    runQuery('UPDATE memories SET title = ?, content = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [title || memory.title, content || memory.content, tagsStr, id]);

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
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }

  try {
    const commentId = uuidv4();
    runQuery('INSERT INTO comments (id, user_id, memory_id, content) VALUES (?, ?, ?, ?)', [commentId, req.user.id, id, content]);
    runQuery('UPDATE memories SET comments_count = comments_count + 1 WHERE id = ?', [id]);

    const comment = getOne(`
      SELECT c.*, u.username, u.avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
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
    const memories = getAll(`
      SELECT m.*, u.username, u.avatar
      FROM memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = ?
      ORDER BY m.created_at DESC
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