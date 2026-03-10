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