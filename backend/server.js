const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 8282;
const JWT_SECRET = process.env.JWT_SECRET || 'openclaw-memory-share-secret-2024';
const ADMIN_KEY = process.env.ADMIN_KEY || 'openclaw-admin-2024';
const DB_PATH = path.join(__dirname, '../data/memory.db');
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Create uploads directory if not exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPEG, PNG, GIF, WebP 格式的图片'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded images statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Initialize database with better-sqlite3 (真正的文件数据库，自动持久化)
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // 启用 WAL 模式，提升性能

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar TEXT DEFAULT '🦞',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT DEFAULT '',
    likes_count INTEGER DEFAULT 0,
    bookmarks_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    is_pinned INTEGER DEFAULT 0,
    visibility TEXT DEFAULT 'public',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS likes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    memory_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, memory_id)
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    memory_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, memory_id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    memory_id TEXT NOT NULL,
    content TEXT NOT NULL,
    reply_to_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sign_ins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    checkin_date TEXT NOT NULL,
    streak INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, checkin_date)
  );

  CREATE TABLE IF NOT EXISTS follows (
    id TEXT PRIMARY KEY,
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    data TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

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
  );

  CREATE TABLE IF NOT EXISTS series_memories (
    id TEXT PRIMARY KEY,
    series_id TEXT NOT NULL,
    memory_id TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(series_id, memory_id)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS comment_likes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    comment_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, comment_id)
  );

  CREATE TABLE IF NOT EXISTS memory_versions (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT DEFAULT '',
    visibility TEXT DEFAULT 'public',
    version_number INTEGER NOT NULL,
    change_summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '📁',
    is_public INTEGER DEFAULT 0,
    memories_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS collection_memories (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    memory_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collection_id, memory_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// 添加 deleted_at 字段（回收站功能）
try {
  db.exec(`ALTER TABLE memories ADD COLUMN deleted_at DATETIME DEFAULT NULL`);
  console.log('✅ Added deleted_at column to memories table');
} catch (e) {
  // 字段已存在，忽略错误
}

console.log('✅ Database initialized at:', DB_PATH);

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

// Optional auth middleware
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      req.user = null;
    }
  }
  next();
};

// ==================== Auth Routes ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: '用户名、邮箱和密码都是必填项' });
  }

  try {
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    db.prepare('INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)').run(userId, username, email, passwordHash);

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
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
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
  const user = db.prepare('SELECT id, username, email, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json(user);
});

// ==================== Memory Routes ====================

// Get all memories
app.get('/api/memories', optionalAuth, (req, res) => {
  const { tag, search, userId, page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const offset = (pageNum - 1) * limitNum;

  let sql = `
    SELECT m.*, u.username, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE memory_id = m.id) as likes_count,
      (SELECT COUNT(*) FROM bookmarks WHERE memory_id = m.id) as bookmarks_count,
      (SELECT COUNT(*) FROM comments WHERE memory_id = m.id) as comments_count
    FROM memories m
    JOIN users u ON m.user_id = u.id
  `;
  const conditions = ['m.deleted_at IS NULL'];
  const params = [];

  // 可见性过滤
  if (req.user) {
    conditions.push("(m.visibility = 'public' OR m.user_id = ?)");
    params.push(req.user.id);
  } else {
    conditions.push("m.visibility = 'public'");
  }

  if (tag) {
    conditions.push('m.tags LIKE ?');
    params.push(`%${tag}%`);
  }

  if (search) {
    conditions.push('(m.title LIKE ? OR m.content LIKE ? OR m.tags LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (userId) {
    conditions.push('m.user_id = ?');
    params.push(userId);
  }

  const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

  // 先获取总数
  const countSql = `SELECT COUNT(*) as total FROM memories m JOIN users u ON m.user_id = u.id ${whereClause}`;
  const countResult = db.prepare(countSql).get(...params);
  const total = countResult.total;
  const totalPages = Math.ceil(total / limitNum);

  // 获取分页数据
  sql += whereClause + ' ORDER BY m.is_pinned DESC, m.created_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  try {
    const memories = db.prepare(sql).all(...params);
    res.json({
      memories,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('获取记忆错误:', error);
    res.status(500).json({ error: '获取记忆失败' });
  }
});

// Get single memory
app.get('/api/memories/:id', optionalAuth, (req, res) => {
  try {
    const memory = db.prepare(`
      SELECT m.*, u.username, u.avatar
      FROM memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).get(req.params.id);

    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    // 检查可见性
    if (memory.visibility !== 'public') {
      if (!req.user || (memory.user_id !== req.user.id)) {
        return res.status(403).json({ error: '无权查看此记忆' });
      }
    }

    // 增加阅读量
    db.prepare('UPDATE memories SET views_count = views_count + 1 WHERE id = ?').run(req.params.id);
    memory.views_count = (memory.views_count || 0) + 1;

    res.json(memory);
  } catch (error) {
    console.error('获取记忆错误:', error);
    res.status(500).json({ error: '获取记忆失败' });
  }
});

// Get related memories (based on tags and same series)
app.get('/api/memories/:id/related', optionalAuth, (req, res) => {
  try {
    const memoryId = req.params.id;
    
    // 获取当前记忆
    const currentMemory = db.prepare('SELECT * FROM memories WHERE id = ? AND deleted_at IS NULL').get(memoryId);
    if (!currentMemory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    const currentTags = currentMemory.tags ? currentMemory.tags.split(',').filter(Boolean) : [];
    const relatedMemories = [];
    const addedIds = new Set([memoryId]); // 排除当前记忆

    // 1. 同系列的记忆（优先级最高）
    const seriesMemories = db.prepare(`
      SELECT m.*, u.username, u.avatar
      FROM series_memories sm
      JOIN memories m ON sm.memory_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE sm.series_id IN (
        SELECT series_id FROM series_memories WHERE memory_id = ?
      )
      AND m.id != ?
      AND m.deleted_at IS NULL
      AND m.visibility = 'public'
      ORDER BY sm.sort_order ASC
      LIMIT 3
    `).all(memoryId, memoryId);

    seriesMemories.forEach(m => {
      if (!addedIds.has(m.id)) {
        relatedMemories.push({ ...m, relation_type: 'series' });
        addedIds.add(m.id);
      }
    });

    // 2. 相同标签的记忆（按匹配标签数量排序）
    if (currentTags.length > 0 && relatedMemories.length < 5) {
      const tagConditions = currentTags.map(() => 'm.tags LIKE ?').join(' OR ');
      const tagParams = currentTags.map(tag => `%"${tag}"%`);
      
      const tagMemories = db.prepare(`
        SELECT m.*, u.username, u.avatar,
          (SELECT COUNT(*) FROM likes WHERE memory_id = m.id) as likes_count
        FROM memories m
        JOIN users u ON m.user_id = u.id
        WHERE (${tagConditions})
        AND m.id NOT IN (${Array.from(addedIds).map(() => '?').join(',')})
        AND m.deleted_at IS NULL
        AND m.visibility = 'public'
        ORDER BY likes_count DESC, m.created_at DESC
        LIMIT 5
      `).all(...tagParams, ...Array.from(addedIds));

      tagMemories.forEach(m => {
        if (!addedIds.has(m.id) && relatedMemories.length < 5) {
          relatedMemories.push({ ...m, relation_type: 'tag' });
          addedIds.add(m.id);
        }
      });
    }

    // 3. 同作者的其他记忆（补充）
    if (relatedMemories.length < 5) {
      const authorMemories = db.prepare(`
        SELECT m.*, u.username, u.avatar,
          (SELECT COUNT(*) FROM likes WHERE memory_id = m.id) as likes_count
        FROM memories m
        JOIN users u ON m.user_id = u.id
        WHERE m.user_id = ?
        AND m.id NOT IN (${Array.from(addedIds).map(() => '?').join(',')})
        AND m.deleted_at IS NULL
        AND m.visibility = 'public'
        ORDER BY likes_count DESC, m.created_at DESC
        LIMIT 3
      `).all(currentMemory.user_id, ...Array.from(addedIds));

      authorMemories.forEach(m => {
        if (!addedIds.has(m.id) && relatedMemories.length < 5) {
          relatedMemories.push({ ...m, relation_type: 'author' });
          addedIds.add(m.id);
        }
      });
    }

    res.json(relatedMemories);
  } catch (error) {
    console.error('获取相关记忆错误:', error);
    res.status(500).json({ error: '获取相关记忆失败' });
  }
});

// Create memory
app.post('/api/memories', authMiddleware, (req, res) => {
  const { title, content, tags, visibility } = req.body;
  const userId = req.user.id;

  if (!title || !content) {
    return res.status(400).json({ error: '标题和内容都是必填项' });
  }

  try {
    const memoryId = uuidv4();
    db.prepare(`
      INSERT INTO memories (id, user_id, title, content, tags, visibility)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(memoryId, userId, title, content, tags || '', visibility || 'public');

    const memory = db.prepare('SELECT * FROM memories WHERE id = ? AND deleted_at IS NULL').get(memoryId);
    res.status(201).json(memory);
  } catch (error) {
    console.error('创建记忆错误:', error);
    res.status(500).json({ error: '创建记忆失败' });
  }
});

// Update memory
app.put('/api/memories/:id', authMiddleware, (req, res) => {
  const { title, content, tags, visibility, changeSummary } = req.body;
  const memoryId = req.params.id;
  const userId = req.user.id;

  try {
    const memory = db.prepare('SELECT * FROM memories WHERE id = ? AND deleted_at IS NULL').get(memoryId);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    if (memory.user_id !== userId) {
      return res.status(403).json({ error: '无权修改此记忆' });
    }

    // 检查是否有实质性修改
    const hasChanges = (title && title !== memory.title) ||
                       (content && content !== memory.content) ||
                       (tags !== undefined && tags !== memory.tags) ||
                       (visibility && visibility !== memory.visibility);

    if (hasChanges) {
      // 保存当前版本到版本历史
      const versionCount = db.prepare('SELECT COUNT(*) as count FROM memory_versions WHERE memory_id = ?').get(memoryId);
      const versionNumber = (versionCount?.count || 0) + 1;

      db.prepare(`
        INSERT INTO memory_versions (id, memory_id, user_id, title, content, tags, visibility, version_number, change_summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), memoryId, userId, memory.title, memory.content, memory.tags, memory.visibility, versionNumber, changeSummary || null);

      // 更新记忆
      db.prepare(`
        UPDATE memories SET title = ?, content = ?, tags = ?, visibility = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(title || memory.title, content || memory.content, tags || memory.tags, visibility || memory.visibility, memoryId);
    }

    const updated = db.prepare('SELECT * FROM memories WHERE id = ?').get(memoryId);
    res.json(updated);
  } catch (error) {
    console.error('更新记忆错误:', error);
    res.status(500).json({ error: '更新记忆失败' });
  }
});

// Delete memory (soft delete - move to trash)
app.delete('/api/memories/:id', authMiddleware, (req, res) => {
  const memoryId = req.params.id;
  const userId = req.user.id;

  try {
    const memory = db.prepare('SELECT * FROM memories WHERE id = ? AND deleted_at IS NULL').get(memoryId);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    if (memory.user_id !== userId) {
      return res.status(403).json({ error: '无权删除此记忆' });
    }

    // 软删除：设置 deleted_at
    db.prepare('UPDATE memories SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(memoryId);

    res.json({ message: '已移至回收站', deletedAt: new Date().toISOString() });
  } catch (error) {
    console.error('删除记忆错误:', error);
    res.status(500).json({ error: '删除记忆失败' });
  }
});

// Toggle like
app.post('/api/memories/:id/like', authMiddleware, (req, res) => {
  const memoryId = req.params.id;
  const userId = req.user.id;

  try {
    const existing = db.prepare('SELECT * FROM likes WHERE user_id = ? AND memory_id = ?').get(userId, memoryId);

    if (existing) {
      db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
      db.prepare('UPDATE memories SET likes_count = (SELECT COUNT(*) FROM likes WHERE memory_id = ?) WHERE id = ?').run(memoryId, memoryId);
      res.json({ liked: false, message: '取消点赞' });
    } else {
      const likeId = uuidv4();
      db.prepare('INSERT INTO likes (id, user_id, memory_id) VALUES (?, ?, ?)').run(likeId, userId, memoryId);
      db.prepare('UPDATE memories SET likes_count = (SELECT COUNT(*) FROM likes WHERE memory_id = ?) WHERE id = ?').run(memoryId, memoryId);
      res.json({ liked: true, message: '点赞成功' });
    }
  } catch (error) {
    console.error('点赞错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// Toggle bookmark
app.post('/api/memories/:id/bookmark', authMiddleware, (req, res) => {
  const memoryId = req.params.id;
  const userId = req.user.id;

  try {
    const existing = db.prepare('SELECT * FROM bookmarks WHERE user_id = ? AND memory_id = ?').get(userId, memoryId);

    if (existing) {
      db.prepare('DELETE FROM bookmarks WHERE id = ?').run(existing.id);
      db.prepare('UPDATE memories SET bookmarks_count = (SELECT COUNT(*) FROM bookmarks WHERE memory_id = ?) WHERE id = ?').run(memoryId, memoryId);
      res.json({ bookmarked: false, message: '取消收藏' });
    } else {
      const bookmarkId = uuidv4();
      db.prepare('INSERT INTO bookmarks (id, user_id, memory_id) VALUES (?, ?, ?)').run(bookmarkId, userId, memoryId);
      db.prepare('UPDATE memories SET bookmarks_count = (SELECT COUNT(*) FROM bookmarks WHERE memory_id = ?) WHERE id = ?').run(memoryId, memoryId);
      res.json({ bookmarked: true, message: '收藏成功' });
    }
  } catch (error) {
    console.error('收藏错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// Toggle pin
app.post('/api/memories/:id/pin', authMiddleware, (req, res) => {
  const memoryId = req.params.id;
  const userId = req.user.id;

  try {
    const memory = db.prepare('SELECT * FROM memories WHERE id = ?').get(memoryId);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    if (memory.user_id !== userId) {
      return res.status(403).json({ error: '无权操作' });
    }

    const newPinnedState = memory.is_pinned ? 0 : 1;
    db.prepare('UPDATE memories SET is_pinned = ? WHERE id = ?').run(newPinnedState, memoryId);

    res.json({ pinned: !!newPinnedState, message: newPinnedState ? '已置顶' : '已取消置顶' });
  } catch (error) {
    console.error('置顶错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// ==================== Comment Routes ====================

// Get comments for a memory
app.get('/api/memories/:id/comments', optionalAuth, (req, res) => {
  try {
    const userId = req.user?.id;
    
    // 获取评论列表，包含点赞数
    const comments = db.prepare(`
      SELECT c.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as likes_count
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.memory_id = ?
      ORDER BY c.created_at DESC
    `).all(req.params.id);

    // 如果用户已登录，检查每条评论是否已被当前用户点赞
    if (userId) {
      const likedCommentIds = db.prepare(`
        SELECT comment_id FROM comment_likes WHERE user_id = ?
      `).all(userId).map(row => row.comment_id);
      
      comments.forEach(comment => {
        comment.is_liked = likedCommentIds.includes(comment.id);
      });
    } else {
      comments.forEach(comment => {
        comment.is_liked = false;
      });
    }

    res.json(comments);
  } catch (error) {
    console.error('获取评论错误:', error);
    res.status(500).json({ error: '获取评论失败' });
  }
});

// Create comment
app.post('/api/memories/:id/comments', authMiddleware, (req, res) => {
  const { content, replyToId } = req.body;
  const memoryId = req.params.id;
  const userId = req.user.id;

  if (!content) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }

  try {
    const commentId = uuidv4();
    db.prepare(`
      INSERT INTO comments (id, user_id, memory_id, content, reply_to_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(commentId, userId, memoryId, content, replyToId || null);

    db.prepare('UPDATE memories SET comments_count = (SELECT COUNT(*) FROM comments WHERE memory_id = ?) WHERE id = ?').run(memoryId, memoryId);

    // 处理@提及 - 检测@用户名并发送通知
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    // 获取记忆信息和评论者信息
    const memory = db.prepare('SELECT m.*, u.username as author_name FROM memories m JOIN users u ON m.user_id = u.id WHERE m.id = ? AND m.deleted_at IS NULL').get(memoryId);
    const commenter = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);

    // 为每个被@的用户发送通知
    const mentionedUserIds = new Set();
    for (const username of mentions) {
      const mentionedUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (mentionedUser && mentionedUser.id !== userId && !mentionedUserIds.has(mentionedUser.id)) {
        mentionedUserIds.add(mentionedUser.id);
        const notificationId = uuidv4();
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title, content, data)
          VALUES (?, ?, 'mention', ?, ?, ?)
        `).run(
          notificationId,
          mentionedUser.id,
          `${commenter.username} 在评论中提到了你`,
          content.substring(0, 100),
          JSON.stringify({ memoryId, commentId, memoryTitle: memory?.title })
        );
      }
    }

    // 如果是回复别人的评论，给被回复者发送通知
    if (replyToId) {
      const replyToComment = db.prepare('SELECT c.user_id, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?').get(replyToId);
      if (replyToComment && replyToComment.user_id !== userId) {
        const notificationId = uuidv4();
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title, content, data)
          VALUES (?, ?, 'reply', ?, ?, ?)
        `).run(
          notificationId,
          replyToComment.user_id,
          `${commenter.username} 回复了你的评论`,
          content.substring(0, 100),
          JSON.stringify({ memoryId, commentId, memoryTitle: memory?.title })
        );
      }
    }

    // 给记忆作者发送评论通知（如果不是自己评论自己的记忆）
    if (memory && memory.user_id !== userId) {
      const notificationId = uuidv4();
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, content, data)
        VALUES (?, ?, 'comment', ?, ?, ?)
      `).run(
        notificationId,
        memory.user_id,
        `${commenter.username} 评论了你的记忆`,
        content.substring(0, 100),
        JSON.stringify({ memoryId, commentId, memoryTitle: memory.title })
      );
    }

    const comment = db.prepare(`
      SELECT c.*, u.username, u.avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(commentId);

    res.status(201).json({ comment, mentions: Array.from(mentionedUserIds) });
  } catch (error) {
    console.error('创建评论错误:', error);
    res.status(500).json({ error: '评论失败' });
  }
});

// Delete comment
app.delete('/api/comments/:id', authMiddleware, (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.id;

  try {
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
    if (!comment) {
      return res.status(404).json({ error: '评论不存在' });
    }

    if (comment.user_id !== userId) {
      return res.status(403).json({ error: '无权删除此评论' });
    }

    const memoryId = comment.memory_id;
    // 先删除评论的点赞
    db.prepare('DELETE FROM comment_likes WHERE comment_id = ?').run(commentId);
    // 再删除评论
    db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
    db.prepare('UPDATE memories SET comments_count = (SELECT COUNT(*) FROM comments WHERE memory_id = ?) WHERE id = ?').run(memoryId, memoryId);

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除评论错误:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

// Like a comment
app.post('/api/comments/:id/like', authMiddleware, (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.id;

  try {
    // 检查评论是否存在
    const comment = db.prepare('SELECT id FROM comments WHERE id = ?').get(commentId);
    if (!comment) {
      return res.status(404).json({ error: '评论不存在' });
    }

    // 检查是否已点赞
    const existingLike = db.prepare('SELECT id FROM comment_likes WHERE user_id = ? AND comment_id = ?').get(userId, commentId);
    if (existingLike) {
      return res.status(400).json({ error: '已点赞过此评论' });
    }

    // 添加点赞
    const likeId = uuidv4();
    db.prepare('INSERT INTO comment_likes (id, user_id, comment_id) VALUES (?, ?, ?)').run(likeId, userId, commentId);

    // 获取更新后的点赞数
    const likesCount = db.prepare('SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = ?').get(commentId).count;

    res.json({ 
      message: '点赞成功',
      likes_count: likesCount,
      is_liked: true
    });
  } catch (error) {
    console.error('评论点赞错误:', error);
    res.status(500).json({ error: '点赞失败' });
  }
});

// Unlike a comment
app.delete('/api/comments/:id/like', authMiddleware, (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.id;

  try {
    // 删除点赞
    const result = db.prepare('DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?').run(userId, commentId);
    
    if (result.changes === 0) {
      return res.status(400).json({ error: '未点赞此评论' });
    }

    // 获取更新后的点赞数
    const likesCount = db.prepare('SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = ?').get(commentId).count;

    res.json({ 
      message: '取消点赞成功',
      likes_count: likesCount,
      is_liked: false
    });
  } catch (error) {
    console.error('取消评论点赞错误:', error);
    res.status(500).json({ error: '取消点赞失败' });
  }
});

// ==================== User Routes ====================

// Get user profile
app.get('/api/user/:id', (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, username, email, avatar, created_at
      FROM users WHERE id = ?
    `).get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 获取用户统计
    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM memories WHERE user_id = ? AND deleted_at IS NULL) as memories_count,
        (SELECT COUNT(*) FROM likes WHERE memory_id IN (SELECT id FROM memories WHERE user_id = ? AND deleted_at IS NULL)) as total_likes,
        (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following_count
    `).get(user.id, user.id, user.id, user.id);

    res.json({ ...user, ...stats });
  } catch (error) {
    console.error('获取用户错误:', error);
    res.status(500).json({ error: '获取用户失败' });
  }
});

// Get user memories
app.get('/api/user/:id/memories', optionalAuth, (req, res) => {
  try {
    let sql = `
      SELECT m.*, u.username, u.avatar
      FROM memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = ? AND m.deleted_at IS NULL
    `;
    const params = [req.params.id];

    // 可见性过滤
    if (!req.user || req.user.id !== req.params.id) {
      sql += " AND m.visibility = 'public'";
    }

    sql += ' ORDER BY m.is_pinned DESC, m.created_at DESC';

    const memories = db.prepare(sql).all(...params);
    res.json(memories);
  } catch (error) {
    console.error('获取用户记忆错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Update user profile
app.put('/api/user/profile', authMiddleware, (req, res) => {
  const { avatar } = req.body;
  const userId = req.user.id;

  try {
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, userId);
    const user = db.prepare('SELECT id, username, email, avatar, created_at FROM users WHERE id = ?').get(userId);
    res.json({ message: '资料更新成功', user });
  } catch (error) {
    console.error('更新资料错误:', error);
    res.status(500).json({ error: '更新资料失败' });
  }
});

// Change password
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
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const isValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: '旧密码错误' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, userId);

    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

// Admin reset password
app.post('/api/admin/reset-password', async (req, res) => {
  const { adminKey, username, newPassword } = req.body;

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
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(newPasswordHash, username);

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
    const user = db.prepare('SELECT created_at FROM users WHERE id = ?').get(userId);

    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM memories WHERE user_id = ? AND deleted_at IS NULL) as memories_count,
        (SELECT COUNT(*) FROM bookmarks WHERE user_id = ?) as bookmarks_count,
        (SELECT COUNT(*) FROM likes WHERE user_id = ?) as likes_given,
        (SELECT COUNT(*) FROM comments WHERE user_id = ?) as comments_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following_count,
        (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers_count
    `).get(userId, userId, userId, userId, userId, userId);

    // 获取签到信息
    const today = new Date().toISOString().split('T')[0];
    const todaySignIn = db.prepare('SELECT * FROM sign_ins WHERE user_id = ? AND checkin_date = ?').get(userId, today);
    const lastSignIn = db.prepare('SELECT * FROM sign_ins ORDER BY checkin_date DESC LIMIT 1').get();

    res.json({
      ...stats,
      joinedAt: user.created_at,
      todaySignedIn: !!todaySignIn,
      currentStreak: lastSignIn?.streak || 0
    });
  } catch (error) {
    console.error('获取统计错误:', error);
    res.status(500).json({ error: '获取统计失败' });
  }
});

// ==================== Sign In Routes ====================

// Daily sign in
app.post('/api/signin', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  try {
    // 检查今天是否已签到
    const existing = db.prepare('SELECT * FROM sign_ins WHERE user_id = ? AND checkin_date = ?').get(userId, today);
    if (existing) {
      return res.status(400).json({ error: '今天已经签到过了' });
    }

    // 计算连续签到天数
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastSignIn = db.prepare('SELECT streak FROM sign_ins WHERE user_id = ? AND checkin_date = ?').get(userId, yesterday);

    const streak = lastSignIn ? lastSignIn.streak + 1 : 1;
    const signInId = uuidv4();

    db.prepare('INSERT INTO sign_ins (id, user_id, checkin_date, streak) VALUES (?, ?, ?, ?)').run(signInId, userId, today, streak);

    res.json({
      message: '签到成功',
      streak,
      reward: streak >= 7 ? '连续签到7天奖励！' : `已连续签到${streak}天`
    });
  } catch (error) {
    console.error('签到错误:', error);
    res.status(500).json({ error: '签到失败' });
  }
});

// Get sign in status
app.get('/api/signin/status', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  try {
    const todaySignIn = db.prepare('SELECT * FROM sign_ins WHERE user_id = ? AND checkin_date = ?').get(userId, today);
    const lastSignIn = db.prepare('SELECT streak FROM sign_ins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 1').get(userId);

    // 获取总签到天数
    const totalSignIns = db.prepare('SELECT COUNT(*) as count FROM sign_ins WHERE user_id = ?').get(userId);

    res.json({
      todaySignedIn: !!todaySignIn,
      currentStreak: lastSignIn?.streak || 0,
      totalSignIns: totalSignIns.count
    });
  } catch (error) {
    console.error('获取签到状态错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// ==================== Follow Routes ====================

// Toggle follow
app.post('/api/follow/:targetId', authMiddleware, (req, res) => {
  const targetId = req.params.targetId;
  const userId = req.user.id;

  if (userId === targetId) {
    return res.status(400).json({ error: '不能关注自己' });
  }

  try {
    const existing = db.prepare('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?').get(userId, targetId);

    if (existing) {
      db.prepare('DELETE FROM follows WHERE id = ?').run(existing.id);
      res.json({ following: false, message: '已取消关注' });
    } else {
      const followId = uuidv4();
      db.prepare('INSERT INTO follows (id, follower_id, following_id) VALUES (?, ?, ?)').run(followId, userId, targetId);
      res.json({ following: true, message: '关注成功' });
    }
  } catch (error) {
    console.error('关注错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// Check if following
app.get('/api/follow/:targetId/status', authMiddleware, (req, res) => {
  const targetId = req.params.targetId;
  const userId = req.user.id;

  try {
    const existing = db.prepare('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?').get(userId, targetId);
    res.json({ following: !!existing });
  } catch (error) {
    console.error('检查关注错误:', error);
    res.status(500).json({ error: '检查失败' });
  }
});

// Get followers
app.get('/api/user/:id/followers', (req, res) => {
  try {
    const followers = db.prepare(`
      SELECT u.id, u.username, u.avatar
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ?
    `).all(req.params.id);

    res.json(followers);
  } catch (error) {
    console.error('获取粉丝错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Get following
app.get('/api/user/:id/following', (req, res) => {
  try {
    const following = db.prepare(`
      SELECT u.id, u.username, u.avatar
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = ?
    `).all(req.params.id);

    res.json(following);
  } catch (error) {
    console.error('获取关注错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// ==================== Notification Routes ====================

// Get notifications
app.get('/api/notifications', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(userId);

    res.json(notifications);
  } catch (error) {
    console.error('获取通知错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authMiddleware, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
    res.json({ message: '已标记为已读' });
  } catch (error) {
    console.error('标记通知错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// Mark all as read
app.put('/api/notifications/read-all', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(userId);
    res.json({ message: '全部已标记为已读' });
  } catch (error) {
    console.error('标记通知错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// Delete notification
app.delete('/api/notifications/:id', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除通知错误:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

// ==================== Series Routes ====================

// Get all series
app.get('/api/series', (req, res) => {
  try {
    const series = db.prepare(`
      SELECT s.*, u.username
      FROM series s
      JOIN users u ON s.user_id = u.id
      WHERE s.is_public = 1
      ORDER BY s.updated_at DESC
    `).all();

    res.json(series);
  } catch (error) {
    console.error('获取系列错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Get user series
app.get('/api/user/series', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    const series = db.prepare(`
      SELECT * FROM series
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `).all(userId);

    res.json(series);
  } catch (error) {
    console.error('获取系列错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Create series
app.post('/api/series', authMiddleware, (req, res) => {
  const { title, description, cover, isPublic } = req.body;
  const userId = req.user.id;

  if (!title) {
    return res.status(400).json({ error: '标题不能为空' });
  }

  try {
    const seriesId = uuidv4();
    db.prepare(`
      INSERT INTO series (id, user_id, title, description, cover, is_public)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(seriesId, userId, title, description || '', cover || '📚', isPublic !== false ? 1 : 0);

    const series = db.prepare('SELECT * FROM series WHERE id = ?').get(seriesId);
    res.status(201).json(series);
  } catch (error) {
    console.error('创建系列错误:', error);
    res.status(500).json({ error: '创建失败' });
  }
});

// Update series
app.put('/api/series/:id', authMiddleware, (req, res) => {
  const { title, description, cover, isPublic } = req.body;
  const seriesId = req.params.id;
  const userId = req.user.id;

  try {
    const series = db.prepare('SELECT * FROM series WHERE id = ?').get(seriesId);
    if (!series) {
      return res.status(404).json({ error: '系列不存在' });
    }

    if (series.user_id !== userId) {
      return res.status(403).json({ error: '无权修改' });
    }

    db.prepare(`
      UPDATE series SET title = ?, description = ?, cover = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title || series.title, description ?? series.description, cover || series.cover, isPublic ?? series.is_public, seriesId);

    const updated = db.prepare('SELECT * FROM series WHERE id = ?').get(seriesId);
    res.json(updated);
  } catch (error) {
    console.error('更新系列错误:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

// Delete series
app.delete('/api/series/:id', authMiddleware, (req, res) => {
  const seriesId = req.params.id;
  const userId = req.user.id;

  try {
    const series = db.prepare('SELECT * FROM series WHERE id = ?').get(seriesId);
    if (!series) {
      return res.status(404).json({ error: '系列不存在' });
    }

    if (series.user_id !== userId) {
      return res.status(403).json({ error: '无权删除' });
    }

    db.prepare('DELETE FROM series_memories WHERE series_id = ?').run(seriesId);
    db.prepare('DELETE FROM series WHERE id = ?').run(seriesId);

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除系列错误:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

// Get series memories
app.get('/api/series/:id/memories', (req, res) => {
  try {
    const memories = db.prepare(`
      SELECT m.*, u.username, u.avatar, sm.sort_order
      FROM series_memories sm
      JOIN memories m ON sm.memory_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE sm.series_id = ?
      ORDER BY sm.sort_order ASC
    `).all(req.params.id);

    res.json(memories);
  } catch (error) {
    console.error('获取系列记忆错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Add memory to series
app.post('/api/series/:id/memories', authMiddleware, (req, res) => {
  const { memoryId, sortOrder } = req.body;
  const seriesId = req.params.id;
  const userId = req.user.id;

  try {
    const series = db.prepare('SELECT * FROM series WHERE id = ?').get(seriesId);
    if (!series) {
      return res.status(404).json({ error: '系列不存在' });
    }

    if (series.user_id !== userId) {
      return res.status(403).json({ error: '无权操作' });
    }

    const existing = db.prepare('SELECT * FROM series_memories WHERE series_id = ? AND memory_id = ?').get(seriesId, memoryId);
    if (existing) {
      return res.status(400).json({ error: '已存在于此系列中' });
    }

    const smId = uuidv4();
    db.prepare(`
      INSERT INTO series_memories (id, series_id, memory_id, sort_order)
      VALUES (?, ?, ?, ?)
    `).run(smId, seriesId, memoryId, sortOrder || 0);

    db.prepare('UPDATE series SET memories_count = memories_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(seriesId);

    res.json({ message: '添加成功' });
  } catch (error) {
    console.error('添加记忆错误:', error);
    res.status(500).json({ error: '添加失败' });
  }
});

// Remove memory from series
app.delete('/api/series/:seriesId/memories/:memoryId', authMiddleware, (req, res) => {
  const { seriesId, memoryId } = req.params;
  const userId = req.user.id;

  try {
    const series = db.prepare('SELECT * FROM series WHERE id = ?').get(seriesId);
    if (!series || series.user_id !== userId) {
      return res.status(403).json({ error: '无权操作' });
    }

    db.prepare('DELETE FROM series_memories WHERE series_id = ? AND memory_id = ?').run(seriesId, memoryId);
    db.prepare('UPDATE series SET memories_count = memories_count - 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(seriesId);

    res.json({ message: '移除成功' });
  } catch (error) {
    console.error('移除记忆错误:', error);
    res.status(500).json({ error: '移除失败' });
  }
});

// ==================== Report Routes ====================

// Create report
app.post('/api/reports', authMiddleware, (req, res) => {
  const { targetType, targetId, reason, description } = req.body;
  const userId = req.user.id;

  if (!targetType || !targetId || !reason) {
    return res.status(400).json({ error: '举报类型、目标和原因都是必填项' });
  }

  try {
    const reportId = uuidv4();
    db.prepare(`
      INSERT INTO reports (id, reporter_id, target_type, target_id, reason, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(reportId, userId, targetType, targetId, reason, description || null);

    res.status(201).json({ message: '举报已提交', reportId });
  } catch (error) {
    console.error('举报错误:', error);
    res.status(500).json({ error: '举报失败' });
  }
});

// ==================== User Search Routes ====================

// Search users for @mentions
app.get('/api/users/search', (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 1) {
    return res.json([]);
  }

  try {
    const users = db.prepare(`
      SELECT id, username, avatar
      FROM users
      WHERE username LIKE ?
      LIMIT 10
    `).all(`%${q}%`);

    res.json(users);
  } catch (error) {
    console.error('搜索用户错误:', error);
    res.status(500).json({ error: '搜索失败' });
  }
});

// ==================== Tag Routes ====================

// Get popular tags
app.get('/api/tags/popular', (req, res) => {
  try {
    const memories = db.prepare("SELECT tags FROM memories WHERE visibility = 'public' AND deleted_at IS NULL").all();

    const tagCount = {};
    memories.forEach(m => {
      if (m.tags) {
        m.tags.split(',').forEach(tag => {
          tag = tag.trim();
          if (tag) {
            tagCount[tag] = (tagCount[tag] || 0) + 1;
          }
        });
      }
    });

    const sortedTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));

    res.json(sortedTags);
  } catch (error) {
    console.error('获取标签错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// ==================== Search & Export Routes ====================

// Search memories
app.get('/api/search', (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: '搜索关键词不能为空' });
  }

  try {
    const memories = db.prepare(`
      SELECT m.*, u.username, u.avatar
      FROM memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.visibility = 'public' AND m.deleted_at IS NULL
        AND (m.title LIKE ? OR m.content LIKE ? OR m.tags LIKE ?)
      ORDER BY m.created_at DESC
      LIMIT 50
    `).all(`%${q}%`, `%${q}%`, `%${q}%`);

    res.json(memories);
  } catch (error) {
    console.error('搜索错误:', error);
    res.status(500).json({ error: '搜索失败' });
  }
});

// Export user data
app.get('/api/user/export', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    const user = db.prepare('SELECT id, username, email, avatar, created_at FROM users WHERE id = ?').get(userId);
    const memories = db.prepare('SELECT * FROM memories WHERE user_id = ? AND deleted_at IS NULL').all(userId);
    const bookmarks = db.prepare('SELECT * FROM bookmarks WHERE user_id = ?').all(userId);

    res.json({
      user,
      memories,
      bookmarks,
      exportedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('导出错误:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

// ==================== Random & Hot Routes ====================

// Get random memory
app.get('/api/memories/random', (req, res) => {
  try {
    const memory = db.prepare(`
      SELECT m.*, u.username, u.avatar
      FROM memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.visibility = 'public' AND m.deleted_at IS NULL
      ORDER BY RANDOM()
      LIMIT 1
    `).get();

    if (!memory) {
      return res.status(404).json({ error: '暂无记忆' });
    }

    res.json(memory);
  } catch (error) {
    console.error('获取随机记忆错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Get hot memories
app.get('/api/memories/hot', (req, res) => {
  try {
    const memories = db.prepare(`
      SELECT m.*, u.username, u.avatar,
        (m.likes_count + m.bookmarks_count + m.comments_count + m.views_count) as hot_score
      FROM memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.visibility = 'public' AND m.deleted_at IS NULL
      ORDER BY hot_score DESC
      LIMIT 10
    `).all();

    res.json(memories);
  } catch (error) {
    console.error('获取热门记忆错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// ==================== Image Upload ====================

// Upload image
app.post('/api/upload/image', authMiddleware, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的图片' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      message: '上传成功',
      url: imageUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('上传图片错误:', error);
    res.status(500).json({ error: '上传失败' });
  }
});

// Delete image (only by the uploader - tracked via filename stored in memory)
app.delete('/api/upload/image/:filename', authMiddleware, (req, res) => {
  const { filename } = req.params;
  const filepath = path.join(UPLOADS_DIR, filename);

  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      res.json({ message: '删除成功' });
    } else {
      res.status(404).json({ error: '图片不存在' });
    }
  } catch (error) {
    console.error('删除图片错误:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

// ==================== Version History Routes ====================

// Get version history for a memory
app.get('/api/memories/:id/versions', authMiddleware, (req, res) => {
  const memoryId = req.params.id;
  const userId = req.user.id;

  try {
    // 检查记忆是否存在且属于当前用户
    const memory = db.prepare('SELECT * FROM memories WHERE id = ? AND deleted_at IS NULL').get(memoryId);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    if (memory.user_id !== userId) {
      return res.status(403).json({ error: '无权查看此记忆的版本历史' });
    }

    const versions = db.prepare(`
      SELECT v.*, u.username, u.avatar
      FROM memory_versions v
      JOIN users u ON v.user_id = u.id
      WHERE v.memory_id = ?
      ORDER BY v.version_number DESC
    `).all(memoryId);

    res.json(versions);
  } catch (error) {
    console.error('获取版本历史错误:', error);
    res.status(500).json({ error: '获取版本历史失败' });
  }
});

// Get specific version
app.get('/api/memories/:id/versions/:versionId', authMiddleware, (req, res) => {
  const { id: memoryId, versionId } = req.params;
  const userId = req.user.id;

  try {
    const memory = db.prepare('SELECT * FROM memories WHERE id = ? AND deleted_at IS NULL').get(memoryId);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    if (memory.user_id !== userId) {
      return res.status(403).json({ error: '无权查看此记忆的版本历史' });
    }

    const version = db.prepare(`
      SELECT v.*, u.username, u.avatar
      FROM memory_versions v
      JOIN users u ON v.user_id = u.id
      WHERE v.id = ? AND v.memory_id = ?
    `).get(versionId, memoryId);

    if (!version) {
      return res.status(404).json({ error: '版本不存在' });
    }

    res.json(version);
  } catch (error) {
    console.error('获取版本详情错误:', error);
    res.status(500).json({ error: '获取版本详情失败' });
  }
});

// Restore to specific version
app.post('/api/memories/:id/versions/:versionId/restore', authMiddleware, (req, res) => {
  const { id: memoryId, versionId } = req.params;
  const userId = req.user.id;

  try {
    const memory = db.prepare('SELECT * FROM memories WHERE id = ? AND deleted_at IS NULL').get(memoryId);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    if (memory.user_id !== userId) {
      return res.status(403).json({ error: '无权恢复此记忆的版本' });
    }

    const version = db.prepare('SELECT * FROM memory_versions WHERE id = ? AND memory_id = ?').get(versionId, memoryId);
    if (!version) {
      return res.status(404).json({ error: '版本不存在' });
    }

    // 先保存当前版本
    const versionCount = db.prepare('SELECT COUNT(*) as count FROM memory_versions WHERE memory_id = ?').get(memoryId);
    const newVersionNumber = (versionCount?.count || 0) + 1;

    db.prepare(`
      INSERT INTO memory_versions (id, memory_id, user_id, title, content, tags, visibility, version_number, change_summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), memoryId, userId, memory.title, memory.content, memory.tags, memory.visibility, newVersionNumber, '恢复前自动保存');

    // 恢复到历史版本
    db.prepare(`
      UPDATE memories SET title = ?, content = ?, tags = ?, visibility = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(version.title, version.content, version.tags, version.visibility, memoryId);

    const updated = db.prepare('SELECT * FROM memories WHERE id = ?').get(memoryId);
    res.json({ message: '恢复成功', memory: updated });
  } catch (error) {
    console.error('恢复版本错误:', error);
    res.status(500).json({ error: '恢复版本失败' });
  }
});

// ==================== Trash Routes ====================

// Get trash list
app.get('/api/trash', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    const memories = db.prepare(`
      SELECT m.*, u.username, u.avatar
      FROM memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = ? AND m.deleted_at IS NOT NULL
      ORDER BY m.deleted_at DESC
    `).all(userId);

    res.json(memories);
  } catch (error) {
    console.error('获取回收站错误:', error);
    res.status(500).json({ error: '获取回收站失败' });
  }
});

// Restore memory from trash
app.post('/api/trash/:id/restore', authMiddleware, (req, res) => {
  const memoryId = req.params.id;
  const userId = req.user.id;

  try {
    const memory = db.prepare('SELECT * FROM memories WHERE id = ? AND deleted_at IS NOT NULL').get(memoryId);
    if (!memory) {
      return res.status(404).json({ error: '回收站中未找到此记忆' });
    }

    if (memory.user_id !== userId) {
      return res.status(403).json({ error: '无权恢复此记忆' });
    }

    db.prepare('UPDATE memories SET deleted_at = NULL WHERE id = ?').run(memoryId);

    const restored = db.prepare('SELECT * FROM memories WHERE id = ?').get(memoryId);
    res.json({ message: '记忆已恢复', memory: restored });
  } catch (error) {
    console.error('恢复记忆错误:', error);
    res.status(500).json({ error: '恢复记忆失败' });
  }
});

// Permanently delete memory
app.delete('/api/trash/:id', authMiddleware, (req, res) => {
  const memoryId = req.params.id;
  const userId = req.user.id;

  try {
    const memory = db.prepare('SELECT * FROM memories WHERE id = ? AND deleted_at IS NOT NULL').get(memoryId);
    if (!memory) {
      return res.status(404).json({ error: '回收站中未找到此记忆' });
    }

    if (memory.user_id !== userId) {
      return res.status(403).json({ error: '无权删除此记忆' });
    }

    // 永久删除相关数据
    db.prepare('DELETE FROM likes WHERE memory_id = ?').run(memoryId);
    db.prepare('DELETE FROM bookmarks WHERE memory_id = ?').run(memoryId);
    db.prepare('DELETE FROM comments WHERE memory_id = ?').run(memoryId);
    db.prepare('DELETE FROM series_memories WHERE memory_id = ?').run(memoryId);
    db.prepare('DELETE FROM memories WHERE id = ?').run(memoryId);

    res.json({ message: '记忆已永久删除' });
  } catch (error) {
    console.error('永久删除记忆错误:', error);
    res.status(500).json({ error: '永久删除失败' });
  }
});

// Empty trash (delete all trashed memories)
app.delete('/api/trash', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    const trashedMemories = db.prepare('SELECT id FROM memories WHERE user_id = ? AND deleted_at IS NOT NULL').all(userId);
    const memoryIds = trashedMemories.map(m => m.id);

    if (memoryIds.length === 0) {
      return res.json({ message: '回收站为空' });
    }

    // 删除所有相关数据
    const placeholders = memoryIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM likes WHERE memory_id IN (${placeholders})`).run(...memoryIds);
    db.prepare(`DELETE FROM bookmarks WHERE memory_id IN (${placeholders})`).run(...memoryIds);
    db.prepare(`DELETE FROM comments WHERE memory_id IN (${placeholders})`).run(...memoryIds);
    db.prepare(`DELETE FROM series_memories WHERE memory_id IN (${placeholders})`).run(...memoryIds);
    db.prepare(`DELETE FROM memories WHERE id IN (${placeholders})`).run(...memoryIds);

    res.json({ message: '回收站已清空', deletedCount: memoryIds.length });
  } catch (error) {
    console.error('清空回收站错误:', error);
    res.status(500).json({ error: '清空回收站失败' });
  }
});

// ==================== Collection Routes ====================

// Get user's collections
app.get('/api/collections', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    const collections = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM collection_memories WHERE collection_id = c.id) as memories_count
      FROM collections c
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC
    `).all(userId);

    res.json(collections);
  } catch (error) {
    console.error('获取收藏夹列表错误:', error);
    res.status(500).json({ error: '获取收藏夹列表失败' });
  }
});

// Get public collections for a user
app.get('/api/users/:userId/collections', (req, res) => {
  const { userId } = req.params;

  try {
    const collections = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM collection_memories WHERE collection_id = c.id) as memories_count
      FROM collections c
      WHERE c.user_id = ? AND c.is_public = 1
      ORDER BY c.updated_at DESC
    `).all(userId);

    res.json(collections);
  } catch (error) {
    console.error('获取公开收藏夹列表错误:', error);
    res.status(500).json({ error: '获取公开收藏夹列表失败' });
  }
});

// Get collection by ID
app.get('/api/collections/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const collection = db.prepare(`
      SELECT c.*, u.username, u.avatar
      FROM collections c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(id);

    if (!collection) {
      return res.status(404).json({ error: '收藏夹不存在' });
    }

    // Check access permission
    if (!collection.is_public && collection.user_id !== userId) {
      return res.status(403).json({ error: '无权查看此收藏夹' });
    }

    res.json(collection);
  } catch (error) {
    console.error('获取收藏夹详情错误:', error);
    res.status(500).json({ error: '获取收藏夹详情失败' });
  }
});

// Get memories in a collection
app.get('/api/collections/:id/memories', optionalAuth, (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);

    if (!collection) {
      return res.status(404).json({ error: '收藏夹不存在' });
    }

    // Check access permission
    if (!collection.is_public && collection.user_id !== userId) {
      return res.status(403).json({ error: '无权查看此收藏夹' });
    }

    const memories = db.prepare(`
      SELECT m.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE memory_id = m.id) as likes_count,
        (SELECT COUNT(*) FROM bookmarks WHERE memory_id = m.id) as bookmarks_count,
        (SELECT COUNT(*) FROM comments WHERE memory_id = m.id) as comments_count,
        cm.sort_order, cm.added_at as collected_at
      FROM collection_memories cm
      JOIN memories m ON cm.memory_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE cm.collection_id = ? AND m.deleted_at IS NULL
      ORDER BY cm.sort_order ASC, cm.added_at DESC
      LIMIT ? OFFSET ?
    `).all(id, limit, offset);

    const totalResult = db.prepare(`
      SELECT COUNT(*) as total
      FROM collection_memories cm
      JOIN memories m ON cm.memory_id = m.id
      WHERE cm.collection_id = ? AND m.deleted_at IS NULL
    `).get(id);

    // Check if current user liked/bookmarked each memory
    const memoriesWithStatus = memories.map(memory => {
      let liked = false;
      let bookmarked = false;

      if (userId) {
        const like = db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND memory_id = ?').get(userId, memory.id);
        const bookmark = db.prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND memory_id = ?').get(userId, memory.id);
        liked = !!like;
        bookmarked = !!bookmark;
      }

      return {
        ...memory,
        liked,
        bookmarked,
        tags: memory.tags ? memory.tags.split(',').filter(Boolean) : []
      };
    });

    res.json({
      collection,
      memories: memoriesWithStatus,
      pagination: {
        page,
        limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / limit)
      }
    });
  } catch (error) {
    console.error('获取收藏夹记忆错误:', error);
    res.status(500).json({ error: '获取收藏夹记忆失败' });
  }
});

// Create collection
app.post('/api/collections', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { name, description, icon, is_public } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: '收藏夹名称不能为空' });
  }

  try {
    const collectionId = uuidv4();
    db.prepare(`
      INSERT INTO collections (id, user_id, name, description, icon, is_public)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(collectionId, userId, name.trim(), description || '', icon || '📁', is_public ? 1 : 0);

    const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(collectionId);
    res.status(201).json(collection);
  } catch (error) {
    console.error('创建收藏夹错误:', error);
    res.status(500).json({ error: '创建收藏夹失败' });
  }
});

// Update collection
app.put('/api/collections/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { name, description, icon, is_public } = req.body;

  try {
    const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);

    if (!collection) {
      return res.status(404).json({ error: '收藏夹不存在' });
    }

    if (collection.user_id !== userId) {
      return res.status(403).json({ error: '无权修改此收藏夹' });
    }

    db.prepare(`
      UPDATE collections
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          icon = COALESCE(?, icon),
          is_public = COALESCE(?, is_public),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, description, icon, is_public === undefined ? null : (is_public ? 1 : 0), id);

    const updated = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('更新收藏夹错误:', error);
    res.status(500).json({ error: '更新收藏夹失败' });
  }
});

// Delete collection
app.delete('/api/collections/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);

    if (!collection) {
      return res.status(404).json({ error: '收藏夹不存在' });
    }

    if (collection.user_id !== userId) {
      return res.status(403).json({ error: '无权删除此收藏夹' });
    }

    // Delete collection memories first (cascade should handle this, but let's be explicit)
    db.prepare('DELETE FROM collection_memories WHERE collection_id = ?').run(id);
    db.prepare('DELETE FROM collections WHERE id = ?').run(id);

    res.json({ message: '收藏夹已删除' });
  } catch (error) {
    console.error('删除收藏夹错误:', error);
    res.status(500).json({ error: '删除收藏夹失败' });
  }
});

// Add memory to collection
app.post('/api/collections/:id/memories/:memoryId', authMiddleware, (req, res) => {
  const { id: collectionId, memoryId } = req.params;
  const userId = req.user.id;

  try {
    const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(collectionId);

    if (!collection) {
      return res.status(404).json({ error: '收藏夹不存在' });
    }

    if (collection.user_id !== userId) {
      return res.status(403).json({ error: '无权修改此收藏夹' });
    }

    const memory = db.prepare('SELECT * FROM memories WHERE id = ? AND deleted_at IS NULL').get(memoryId);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    // Check if already in collection
    const existing = db.prepare('SELECT * FROM collection_memories WHERE collection_id = ? AND memory_id = ?').get(collectionId, memoryId);
    if (existing) {
      return res.status(400).json({ error: '记忆已在此收藏夹中' });
    }

    // Get max sort order
    const maxSort = db.prepare('SELECT MAX(sort_order) as max_sort FROM collection_memories WHERE collection_id = ?').get(collectionId);
    const sortOrder = (maxSort?.max_sort || 0) + 1;

    const cmId = uuidv4();
    db.prepare(`
      INSERT INTO collection_memories (id, collection_id, memory_id, user_id, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(cmId, collectionId, memoryId, userId, sortOrder);

    // Update collection's updated_at
    db.prepare('UPDATE collections SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(collectionId);

    res.status(201).json({ message: '已添加到收藏夹', sort_order: sortOrder });
  } catch (error) {
    console.error('添加记忆到收藏夹错误:', error);
    res.status(500).json({ error: '添加记忆到收藏夹失败' });
  }
});

// Remove memory from collection
app.delete('/api/collections/:id/memories/:memoryId', authMiddleware, (req, res) => {
  const { id: collectionId, memoryId } = req.params;
  const userId = req.user.id;

  try {
    const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(collectionId);

    if (!collection) {
      return res.status(404).json({ error: '收藏夹不存在' });
    }

    if (collection.user_id !== userId) {
      return res.status(403).json({ error: '无权修改此收藏夹' });
    }

    const result = db.prepare('DELETE FROM collection_memories WHERE collection_id = ? AND memory_id = ?').run(collectionId, memoryId);

    if (result.changes === 0) {
      return res.status(404).json({ error: '记忆不在此收藏夹中' });
    }

    // Update collection's updated_at
    db.prepare('UPDATE collections SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(collectionId);

    res.json({ message: '已从收藏夹移除' });
  } catch (error) {
    console.error('从收藏夹移除记忆错误:', error);
    res.status(500).json({ error: '从收藏夹移除记忆失败' });
  }
});

// Reorder memories in collection
app.put('/api/collections/:id/reorder', authMiddleware, (req, res) => {
  const { id: collectionId } = req.params;
  const userId = req.user.id;
  const { memoryIds } = req.body;

  if (!memoryIds || !Array.isArray(memoryIds)) {
    return res.status(400).json({ error: '无效的记忆ID列表' });
  }

  try {
    const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(collectionId);

    if (!collection) {
      return res.status(404).json({ error: '收藏夹不存在' });
    }

    if (collection.user_id !== userId) {
      return res.status(403).json({ error: '无权修改此收藏夹' });
    }

    // Update sort order for each memory
    const updateStmt = db.prepare('UPDATE collection_memories SET sort_order = ? WHERE collection_id = ? AND memory_id = ?');
    for (let i = 0; i < memoryIds.length; i++) {
      updateStmt.run(i, collectionId, memoryIds[i]);
    }

    // Update collection's updated_at
    db.prepare('UPDATE collections SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(collectionId);

    res.json({ message: '排序已更新' });
  } catch (error) {
    console.error('更新收藏夹排序错误:', error);
    res.status(500).json({ error: '更新收藏夹排序失败' });
  }
});

// Check which collections a memory is in
app.get('/api/memories/:id/collections', authMiddleware, (req, res) => {
  const { id: memoryId } = req.params;
  const userId = req.user.id;

  try {
    const collections = db.prepare(`
      SELECT c.id, c.name, c.icon
      FROM collection_memories cm
      JOIN collections c ON cm.collection_id = c.id
      WHERE cm.memory_id = ? AND c.user_id = ?
    `).all(memoryId, userId);

    res.json(collections);
  } catch (error) {
    console.error('获取记忆收藏夹错误:', error);
    res.status(500).json({ error: '获取记忆收藏夹失败' });
  }
});

// ==================== Batch Operations ====================

// Batch delete memories
app.post('/api/memories/batch/delete', authMiddleware, (req, res) => {
  const { memoryIds } = req.body;
  const userId = req.user.id;

  if (!memoryIds || !Array.isArray(memoryIds) || memoryIds.length === 0) {
    return res.status(400).json({ error: '请提供要删除的记忆ID列表' });
  }

  if (memoryIds.length > 50) {
    return res.status(400).json({ error: '一次最多删除50条记忆' });
  }

  try {
    const deletedAt = new Date().toISOString();
    const deleteStmt = db.prepare(`
      UPDATE memories 
      SET deleted_at = ? 
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `);

    let successCount = 0;
    const failedIds = [];

    for (const memoryId of memoryIds) {
      const result = deleteStmt.run(deletedAt, memoryId, userId);
      if (result.changes > 0) {
        successCount++;
      } else {
        failedIds.push(memoryId);
      }
    }

    res.json({
      message: `成功删除 ${successCount} 条记忆`,
      successCount,
      failedCount: failedIds.length,
      failedIds
    });
  } catch (error) {
    console.error('批量删除记忆错误:', error);
    res.status(500).json({ error: '批量删除失败' });
  }
});

// Batch bookmark memories
app.post('/api/memories/batch/bookmark', authMiddleware, (req, res) => {
  const { memoryIds } = req.body;
  const userId = req.user.id;

  if (!memoryIds || !Array.isArray(memoryIds) || memoryIds.length === 0) {
    return res.status(400).json({ error: '请提供要收藏的记忆ID列表' });
  }

  if (memoryIds.length > 50) {
    return res.status(400).json({ error: '一次最多收藏50条记忆' });
  }

  try {
    let successCount = 0;
    let alreadyBookmarkedCount = 0;
    const failedIds = [];

    for (const memoryId of memoryIds) {
      // Check if memory exists
      const memory = db.prepare('SELECT id FROM memories WHERE id = ? AND deleted_at IS NULL').get(memoryId);
      if (!memory) {
        failedIds.push(memoryId);
        continue;
      }

      // Check if already bookmarked
      const existing = db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND memory_id = ?').get(userId, memoryId);
      if (existing) {
        alreadyBookmarkedCount++;
        continue;
      }

      // Add bookmark
      const bookmarkId = uuidv4();
      db.prepare('INSERT INTO bookmarks (id, user_id, memory_id) VALUES (?, ?, ?)').run(bookmarkId, userId, memoryId);
      
      // Update bookmarks count
      db.prepare('UPDATE memories SET bookmarks_count = bookmarks_count + 1 WHERE id = ?').run(memoryId);
      
      successCount++;
    }

    res.json({
      message: `成功收藏 ${successCount} 条记忆${alreadyBookmarkedCount > 0 ? `，${alreadyBookmarkedCount} 条已收藏` : ''}`,
      successCount,
      alreadyBookmarkedCount,
      failedCount: failedIds.length,
      failedIds
    });
  } catch (error) {
    console.error('批量收藏记忆错误:', error);
    res.status(500).json({ error: '批量收藏失败' });
  }
});

// Batch unbookmark memories
app.post('/api/memories/batch/unbookmark', authMiddleware, (req, res) => {
  const { memoryIds } = req.body;
  const userId = req.user.id;

  if (!memoryIds || !Array.isArray(memoryIds) || memoryIds.length === 0) {
    return res.status(400).json({ error: '请提供要取消收藏的记忆ID列表' });
  }

  if (memoryIds.length > 50) {
    return res.status(400).json({ error: '一次最多操作50条记忆' });
  }

  try {
    let successCount = 0;
    const failedIds = [];

    for (const memoryId of memoryIds) {
      const result = db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND memory_id = ?').run(userId, memoryId);
      if (result.changes > 0) {
        db.prepare('UPDATE memories SET bookmarks_count = bookmarks_count - 1 WHERE id = ?').run(memoryId);
        successCount++;
      } else {
        failedIds.push(memoryId);
      }
    }

    res.json({
      message: `成功取消收藏 ${successCount} 条记忆`,
      successCount,
      failedCount: failedIds.length,
      failedIds
    });
  } catch (error) {
    console.error('批量取消收藏记忆错误:', error);
    res.status(500).json({ error: '批量取消收藏失败' });
  }
});

// Batch add to series
app.post('/api/memories/batch/series', authMiddleware, (req, res) => {
  const { memoryIds, seriesId } = req.body;
  const userId = req.user.id;

  if (!memoryIds || !Array.isArray(memoryIds) || memoryIds.length === 0) {
    return res.status(400).json({ error: '请提供要添加的记忆ID列表' });
  }

  if (!seriesId) {
    return res.status(400).json({ error: '请提供系列ID' });
  }

  if (memoryIds.length > 50) {
    return res.status(400).json({ error: '一次最多添加50条记忆' });
  }

  try {
    // Check series ownership
    const series = db.prepare('SELECT * FROM series WHERE id = ?').get(seriesId);
    if (!series) {
      return res.status(404).json({ error: '系列不存在' });
    }

    if (series.user_id !== userId) {
      return res.status(403).json({ error: '无权修改此系列' });
    }

    let successCount = 0;
    let alreadyInSeriesCount = 0;
    const failedIds = [];

    for (const memoryId of memoryIds) {
      // Check memory ownership
      const memory = db.prepare('SELECT * FROM memories WHERE id = ? AND deleted_at IS NULL').get(memoryId);
      if (!memory || memory.user_id !== userId) {
        failedIds.push(memoryId);
        continue;
      }

      // Check if already in series
      const existing = db.prepare('SELECT id FROM series_memories WHERE series_id = ? AND memory_id = ?').get(seriesId, memoryId);
      if (existing) {
        alreadyInSeriesCount++;
        continue;
      }

      // Get max sort order
      const maxSort = db.prepare('SELECT MAX(sort_order) as max_sort FROM series_memories WHERE series_id = ?').get(seriesId);
      const sortOrder = (maxSort?.max_sort || 0) + 1;

      const smId = uuidv4();
      db.prepare('INSERT INTO series_memories (id, series_id, memory_id, sort_order) VALUES (?, ?, ?, ?)').run(smId, seriesId, memoryId, sortOrder);
      
      successCount++;
    }

    // Update series count
    db.prepare('UPDATE series SET memories_count = (SELECT COUNT(*) FROM series_memories WHERE series_id = ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(seriesId, seriesId);

    res.json({
      message: `成功添加 ${successCount} 条记忆到系列${alreadyInSeriesCount > 0 ? `，${alreadyInSeriesCount} 条已在系列中` : ''}`,
      successCount,
      alreadyInSeriesCount,
      failedCount: failedIds.length,
      failedIds
    });
  } catch (error) {
    console.error('批量添加到系列错误:', error);
    res.status(500).json({ error: '批量添加到系列失败' });
  }
});

// Batch add to collection
app.post('/api/memories/batch/collection', authMiddleware, (req, res) => {
  const { memoryIds, collectionId } = req.body;
  const userId = req.user.id;

  if (!memoryIds || !Array.isArray(memoryIds) || memoryIds.length === 0) {
    return res.status(400).json({ error: '请提供要添加的记忆ID列表' });
  }

  if (!collectionId) {
    return res.status(400).json({ error: '请提供收藏夹ID' });
  }

  if (memoryIds.length > 50) {
    return res.status(400).json({ error: '一次最多添加50条记忆' });
  }

  try {
    // Check collection ownership
    const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(collectionId);
    if (!collection) {
      return res.status(404).json({ error: '收藏夹不存在' });
    }

    if (collection.user_id !== userId) {
      return res.status(403).json({ error: '无权修改此收藏夹' });
    }

    let successCount = 0;
    let alreadyInCollectionCount = 0;
    const failedIds = [];

    for (const memoryId of memoryIds) {
      // Check memory exists
      const memory = db.prepare('SELECT * FROM memories WHERE id = ? AND deleted_at IS NULL').get(memoryId);
      if (!memory) {
        failedIds.push(memoryId);
        continue;
      }

      // Check if already in collection
      const existing = db.prepare('SELECT id FROM collection_memories WHERE collection_id = ? AND memory_id = ?').get(collectionId, memoryId);
      if (existing) {
        alreadyInCollectionCount++;
        continue;
      }

      // Get max sort order
      const maxSort = db.prepare('SELECT MAX(sort_order) as max_sort FROM collection_memories WHERE collection_id = ?').get(collectionId);
      const sortOrder = (maxSort?.max_sort || 0) + 1;

      const cmId = uuidv4();
      db.prepare('INSERT INTO collection_memories (id, collection_id, memory_id, user_id, sort_order) VALUES (?, ?, ?, ?, ?)').run(cmId, collectionId, memoryId, userId, sortOrder);
      
      successCount++;
    }

    // Update collection's updated_at
    db.prepare('UPDATE collections SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(collectionId);

    res.json({
      message: `成功添加 ${successCount} 条记忆到收藏夹${alreadyInCollectionCount > 0 ? `，${alreadyInCollectionCount} 条已在收藏夹中` : ''}`,
      successCount,
      alreadyInCollectionCount,
      failedCount: failedIds.length,
      failedIds
    });
  } catch (error) {
    console.error('批量添加到收藏夹错误:', error);
    res.status(500).json({ error: '批量添加到收藏夹失败' });
  }
});

// Batch change visibility
app.post('/api/memories/batch/visibility', authMiddleware, (req, res) => {
  const { memoryIds, visibility } = req.body;
  const userId = req.user.id;

  if (!memoryIds || !Array.isArray(memoryIds) || memoryIds.length === 0) {
    return res.status(400).json({ error: '请提供要修改的记忆ID列表' });
  }

  if (!['public', 'followers', 'private'].includes(visibility)) {
    return res.status(400).json({ error: '无效的可见性设置' });
  }

  if (memoryIds.length > 50) {
    return res.status(400).json({ error: '一次最多修改50条记忆' });
  }

  try {
    const updateStmt = db.prepare(`
      UPDATE memories 
      SET visibility = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `);

    let successCount = 0;
    const failedIds = [];

    for (const memoryId of memoryIds) {
      const result = updateStmt.run(visibility, memoryId, userId);
      if (result.changes > 0) {
        successCount++;
      } else {
        failedIds.push(memoryId);
      }
    }

    const visibilityNames = { public: '公开', followers: '仅关注者', private: '私密' };
    res.json({
      message: `成功将 ${successCount} 条记忆设为${visibilityNames[visibility]}`,
      successCount,
      failedCount: failedIds.length,
      failedIds
    });
  } catch (error) {
    console.error('批量修改可见性错误:', error);
    res.status(500).json({ error: '批量修改可见性失败' });
  }
});

// ==================== Health Check ====================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'better-sqlite3 (persistent)'
  });
});

// ==================== Start Server ====================

app.listen(PORT, () => {
  console.log(`🦞 Memory Share API running on http://localhost:${PORT}`);
  console.log(`📁 Database: ${DB_PATH}`);
  console.log(`💾 Database type: better-sqlite3 (persistent file-based)`);
});