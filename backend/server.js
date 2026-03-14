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

  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    memory_id TEXT,
    title TEXT NOT NULL,
    content TEXT,
    reminder_type TEXT DEFAULT 'once',
    reminder_date TEXT NOT NULL,
    repeat_interval TEXT,
    is_completed INTEGER DEFAULT 0,
    last_triggered TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    review TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(memory_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_date TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS milestone_memories (
    id TEXT PRIMARY KEY,
    milestone_id TEXT NOT NULL,
    memory_id TEXT NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(milestone_id, memory_id)
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

  CREATE TABLE IF NOT EXISTS comment_reactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    comment_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, comment_id, emoji)
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

  CREATE TABLE IF NOT EXISTS tag_follows (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tag)
  );

  CREATE TABLE IF NOT EXISTS memory_references (
    id TEXT PRIMARY KEY,
    source_memory_id TEXT NOT NULL,
    target_memory_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_memory_id, target_memory_id)
  );

  CREATE TABLE IF NOT EXISTS moments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    images TEXT DEFAULT '',
    topics TEXT DEFAULT '',
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS moment_likes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    moment_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, moment_id)
  );

  CREATE TABLE IF NOT EXISTS moment_comments (
    id TEXT PRIMARY KEY,
    moment_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS moment_comment_likes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    comment_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, comment_id)
  );

  CREATE TABLE IF NOT EXISTS read_later (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    memory_id TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, memory_id)
  );

  CREATE TABLE IF NOT EXISTS memory_feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    memory_id TEXT NOT NULL,
    is_helpful INTEGER NOT NULL,
    feedback TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, memory_id)
  );

  CREATE TABLE IF NOT EXISTS view_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    memory_id TEXT NOT NULL,
    view_duration INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create indexes for view_history
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_view_history_user ON view_history(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_view_history_memory ON view_history(memory_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_view_history_created ON view_history(created_at)`);
} catch (e) {
  // Indexes already exist
}

// 创建阅读进度表
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reading_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      memory_id TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      progress INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, memory_id)
    )
  `);
  console.log('✅ Created reading_progress table');
} catch (e) {
  // 表已存在
}

// Create indexes for memory_references
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_source_memory ON memory_references(source_memory_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_target_memory ON memory_references(target_memory_id)`);
  console.log('✅ Created indexes for memory_references table');
} catch (e) {
  // Indexes already exist
}

// 添加 deleted_at 字段（回收站功能）
try {
  db.exec(`ALTER TABLE memories ADD COLUMN deleted_at DATETIME DEFAULT NULL`);
  console.log('✅ Added deleted_at column to memories table');
} catch (e) {
  // 字段已存在，忽略错误
}

// 添加用户等级和积分字段
try {
  db.exec(`ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0`);
  db.exec(`ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1`);
  console.log('✅ Added points and level columns to users table');
} catch (e) {
  // 字段已存在，忽略错误
}

// 添加锁定相关字段
try {
  db.exec(`ALTER TABLE memories ADD COLUMN is_locked INTEGER DEFAULT 0`);
  db.exec(`ALTER TABLE memories ADD COLUMN lock_password TEXT DEFAULT NULL`);
  console.log('✅ Added lock columns to memories table');
} catch (e) {
  // 字段已存在，忽略错误
}

// 添加归档字段
try {
  db.exec(`ALTER TABLE memories ADD COLUMN archived_at DATETIME DEFAULT NULL`);
  console.log('✅ Added archived_at column to memories table');
} catch (e) {
  // 字段已存在，忽略错误
}

console.log('✅ Database initialized at:', DB_PATH);

// 解析记忆内容中的引用 [[memoryId]] 格式
function extractReferences(content) {
  const referenceRegex = /\[\[([a-f0-9-]{36})\]\]/g;
  const references = [];
  let match;
  while ((match = referenceRegex.exec(content)) !== null) {
    references.push(match[1]);
  }
  return [...new Set(references)]; // 去重
}

// 更新记忆引用关系
function updateMemoryReferences(sourceId, content) {
  const references = extractReferences(content);

  // 删除旧的引用
  db.prepare('DELETE FROM memory_references WHERE source_memory_id = ?').run(sourceId);

  // 添加新的引用
  const insertRef = db.prepare(`
    INSERT OR IGNORE INTO memory_references (id, source_memory_id, target_memory_id)
    VALUES (?, ?, ?)
  `);

  for (const targetId of references) {
    // 检查目标记忆是否存在
    const targetExists = db.prepare('SELECT id FROM memories WHERE id = ? AND deleted_at IS NULL').get(targetId);
    if (targetExists) {
      insertRef.run(uuidv4(), sourceId, targetId);
    }
  }
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
  const conditions = ['m.deleted_at IS NULL', 'm.archived_at IS NULL'];
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

// 搜索记忆（用于引用搜索）- 必须在 /api/memories/:id 之前
app.get('/api/memories/search-for-reference', optionalAuth, (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json([]);
    }

    const searchTerm = `%${q.trim()}%`;
    const memories = db.prepare(`
      SELECT m.id, m.title, m.tags, m.created_at,
             u.username, u.avatar
      FROM memories m
      JOIN users u ON m.user_id = u.id
      WHERE (m.title LIKE ? OR m.content LIKE ?)
      AND m.deleted_at IS NULL
      AND m.visibility = 'public'
      ORDER BY m.created_at DESC
      LIMIT 10
    `).all(searchTerm, searchTerm);

    res.json(memories);
  } catch (error) {
    console.error('搜索记忆错误:', error);
    res.status(500).json({ error: '搜索记忆失败' });
  }
});

// 搜索记忆 API - 必须在 /api/memories/:id 之前
app.get('/api/memories/search', optionalAuth, (req, res) => {
  const { q, page = 1, limit = 10, startDate, endDate, tags, author, sort = 'relevance' } = req.query;
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const offset = (pageNum - 1) * limitNum;

  // 允许无关键词时使用筛选器搜索
  const hasKeyword = q && q.trim() !== '';
  const hasFilters = startDate || endDate || tags || author;

  if (!hasKeyword && !hasFilters) {
    return res.json({ memories: [], pagination: { page: 1, limit: limitNum, total: 0, totalPages: 0 } });
  }

  const conditions = ['m.deleted_at IS NULL', 'm.archived_at IS NULL'];
  const params = [];

  // 关键词搜索
  if (hasKeyword) {
    const searchTerm = `%${q.trim()}%`;
    conditions.push('(m.title LIKE ? OR m.content LIKE ? OR m.tags LIKE ?)');
    params.push(searchTerm, searchTerm, searchTerm);
  }

  // 时间范围筛选
  if (startDate) {
    conditions.push('m.created_at >= ?');
    params.push(startDate + ' 00:00:00');
  }
  if (endDate) {
    conditions.push('m.created_at <= ?');
    params.push(endDate + ' 23:59:59');
  }

  // 标签筛选（支持多标签，逗号分隔）
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim()).filter(t => t);
    if (tagList.length > 0) {
      const tagConditions = tagList.map(() => 'm.tags LIKE ?');
      conditions.push(`(${tagConditions.join(' OR ')})`);
      tagList.forEach(tag => params.push(`%"${tag}"%`));
    }
  }

  // 作者筛选
  if (author) {
    conditions.push('u.username = ?');
    params.push(author.trim());
  }

  // 可见性过滤
  if (req.user) {
    conditions.push("(m.visibility = 'public' OR m.user_id = ?)");
    params.push(req.user.id);
  } else {
    conditions.push("m.visibility = 'public'");
  }

  const whereClause = ' WHERE ' + conditions.join(' AND ');

  // 排序方式
  let orderBy = 'm.created_at DESC';
  if (sort === 'likes') {
    orderBy = 'likes_count DESC, m.created_at DESC';
  } else if (sort === 'comments') {
    orderBy = 'comments_count DESC, m.created_at DESC';
  } else if (sort === 'oldest') {
    orderBy = 'm.created_at ASC';
  }
  // relevance 默认按创建时间

  // 获取总数
  const countSql = `SELECT COUNT(*) as total FROM memories m JOIN users u ON m.user_id = u.id ${whereClause}`;
  const countResult = db.prepare(countSql).get(...params);
  const total = countResult.total;
  const totalPages = Math.ceil(total / limitNum);

  // 获取分页数据
  const sql = `
    SELECT m.*, u.username, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE memory_id = m.id) as likes_count,
      (SELECT COUNT(*) FROM bookmarks WHERE memory_id = m.id) as bookmarks_count,
      (SELECT COUNT(*) FROM comments WHERE memory_id = m.id) as comments_count
    FROM memories m
    JOIN users u ON m.user_id = u.id
    ${whereClause}
    ORDER BY m.is_pinned DESC, ${orderBy}
    LIMIT ? OFFSET ?
  `;
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
      },
      filters: { startDate, endDate, tags, author, sort }
    });
  } catch (error) {
    console.error('搜索记忆错误:', error);
    res.status(500).json({ error: '搜索失败' });
  }
});

// 热门记忆 API - 必须在 /api/memories/:id 之前
app.get('/api/memories/hot', (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const offset = (pageNum - 1) * limitNum;

  try {
    // 获取总数
    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM memories 
      WHERE visibility = 'public' AND deleted_at IS NULL
    `).get();
    const total = countResult.total;
    const totalPages = Math.ceil(total / limitNum);

    // 获取分页数据
    const memories = db.prepare(`
      SELECT m.*, u.username, u.avatar,
        (m.likes_count + m.bookmarks_count + m.comments_count + m.views_count) as hot_score
      FROM memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.visibility = 'public' AND m.deleted_at IS NULL
      ORDER BY hot_score DESC
      LIMIT ? OFFSET ?
    `).all(limitNum, offset);

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
    console.error('获取热门记忆错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Calendar view - get memories by month (must be before /:id)
app.get('/api/memories/calendar', optionalAuth, (req, res) => {
  const { year, month, userId: targetUserId } = req.query;
  
  const targetYear = parseInt(year) || new Date().getFullYear();
  const targetMonth = parseInt(month) || (new Date().getMonth() + 1);
  
  const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const endDate = targetMonth === 12 
    ? `${targetYear + 1}-01-01` 
    : `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`;
  
  try {
    let sql = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        GROUP_CONCAT(id) as memory_ids
      FROM memories
      WHERE deleted_at IS NULL
        AND created_at >= ?
        AND created_at < ?
    `;
    const params = [startDate, endDate];
    
    if (targetUserId) {
      sql += ' AND user_id = ?';
      params.push(targetUserId);
    }
    
    if (req.user) {
      if (targetUserId && targetUserId !== req.user.id) {
        sql += " AND visibility = 'public'";
      }
    } else {
      sql += " AND visibility = 'public'";
    }
    
    sql += ' GROUP BY DATE(created_at) ORDER BY date ASC';
    
    const dailyStats = db.prepare(sql).all(...params);
    
    const calendarData = dailyStats.map(day => {
      const ids = day.memory_ids.split(',');
      const previewSql = `
        SELECT id, title, tags, visibility
        FROM memories
        WHERE id IN (${ids.slice(0, 5).map(() => '?').join(',')})
        ORDER BY created_at ASC
      `;
      const previews = db.prepare(previewSql).all(...ids.slice(0, 5));
      
      return {
        date: day.date,
        count: day.count,
        previews
      };
    });
    
    const monthStats = {
      total: dailyStats.reduce((sum, d) => sum + d.count, 0),
      activeDays: dailyStats.length,
      mostActiveDay: dailyStats.length > 0 
        ? dailyStats.reduce((max, d) => d.count > max.count ? d : max, dailyStats[0])
        : null
    };
    
    res.json({
      year: targetYear,
      month: targetMonth,
      calendarData,
      monthStats
    });
  } catch (error) {
    console.error('获取日历数据错误:', error);
    res.status(500).json({ error: '获取日历数据失败' });
  }
});

// Get memories by specific date (must be before /:id)
app.get('/api/memories/by-date/:date', optionalAuth, (req, res) => {
  const { date } = req.params;
  const { userId: targetUserId, page = 1, limit = 10 } = req.query;
  
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: '日期格式错误，应为 YYYY-MM-DD' });
  }
  
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const offset = (pageNum - 1) * limitNum;
  
  try {
    const conditions = [
      'm.deleted_at IS NULL',
      "DATE(m.created_at) = ?"
    ];
    const params = [date];
    
    if (targetUserId) {
      conditions.push('m.user_id = ?');
      params.push(targetUserId);
    }
    
    if (req.user) {
      if (targetUserId && targetUserId !== req.user.id) {
        conditions.push("m.visibility = 'public'");
      }
    } else {
      conditions.push("m.visibility = 'public'");
    }
    
    const whereClause = ' WHERE ' + conditions.join(' AND ');
    
    const countSql = `SELECT COUNT(*) as total FROM memories m JOIN users u ON m.user_id = u.id ${whereClause}`;
    const countResult = db.prepare(countSql).get(...params);
    const total = countResult.total;
    const totalPages = Math.ceil(total / limitNum);
    
    const sql = `
      SELECT m.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE memory_id = m.id) as likes_count,
        (SELECT COUNT(*) FROM bookmarks WHERE memory_id = m.id) as bookmarks_count,
        (SELECT COUNT(*) FROM comments WHERE memory_id = m.id) as comments_count
      FROM memories m
      JOIN users u ON m.user_id = u.id
      ${whereClause}
      ORDER BY m.created_at ASC
      LIMIT ? OFFSET ?
    `;
    params.push(limitNum, offset);
    
    const memories = db.prepare(sql).all(...params);
    
    res.json({
      date,
      memories,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('获取日期记忆错误:', error);
    res.status(500).json({ error: '获取日期记忆失败' });
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

// 获取记忆的引用列表（当前记忆引用了哪些记忆）
app.get('/api/memories/:id/references', optionalAuth, (req, res) => {
  try {
    const memoryId = req.params.id;

    // 检查记忆是否存在
    const memory = db.prepare('SELECT id FROM memories WHERE id = ? AND deleted_at IS NULL').get(memoryId);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    // 获取引用的记忆
    const references = db.prepare(`
      SELECT m.id, m.title, m.tags, m.visibility, m.created_at,
             u.username, u.avatar,
             mr.created_at as reference_created_at
      FROM memory_references mr
      JOIN memories m ON mr.target_memory_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE mr.source_memory_id = ?
      AND m.deleted_at IS NULL
      ORDER BY mr.created_at DESC
    `).all(memoryId);

    // 过滤不可见的记忆
    const visibleReferences = references.filter(ref => {
      if (ref.visibility === 'public') return true;
      if (req.user && ref.visibility === 'private') {
        // 私有记忆只有作者可见
        return db.prepare('SELECT user_id FROM memories WHERE id = ?').get(ref.id)?.user_id === req.user.id;
      }
      return false;
    });

    res.json(visibleReferences);
  } catch (error) {
    console.error('获取引用列表错误:', error);
    res.status(500).json({ error: '获取引用列表失败' });
  }
});

// 获取记忆的反向引用列表（哪些记忆引用了当前记忆）
app.get('/api/memories/:id/backlinks', optionalAuth, (req, res) => {
  try {
    const memoryId = req.params.id;

    // 检查记忆是否存在
    const memory = db.prepare('SELECT id FROM memories WHERE id = ? AND deleted_at IS NULL').get(memoryId);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    // 获取反向引用的记忆
    const backlinks = db.prepare(`
      SELECT m.id, m.title, m.tags, m.visibility, m.created_at,
             u.username, u.avatar,
             mr.created_at as reference_created_at
      FROM memory_references mr
      JOIN memories m ON mr.source_memory_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE mr.target_memory_id = ?
      AND m.deleted_at IS NULL
      ORDER BY mr.created_at DESC
    `).all(memoryId);

    // 过滤不可见的记忆
    const visibleBacklinks = backlinks.filter(ref => {
      if (ref.visibility === 'public') return true;
      if (req.user && ref.visibility === 'private') {
        return db.prepare('SELECT user_id FROM memories WHERE id = ?').get(ref.id)?.user_id === req.user.id;
      }
      return false;
    });

    res.json(visibleBacklinks);
  } catch (error) {
    console.error('获取反向引用列表错误:', error);
    res.status(500).json({ error: '获取反向引用列表失败' });
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

    // 解析并保存引用关系
    updateMemoryReferences(memoryId, content);

    // 通知关注者有新内容
    if (visibility === 'public' || !visibility) {
      const followers = db.prepare('SELECT follower_id FROM follows WHERE following_id = ?').all(userId);
      if (followers.length > 0) {
        const author = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
        followers.forEach(follower => {
          const notificationId = uuidv4();
          db.prepare(`
            INSERT INTO notifications (id, user_id, type, title, content, data)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            notificationId,
            follower.follower_id,
            'new_memory',
            `${author?.username || '用户'}发布了新记忆`,
            title || '新记忆',
            JSON.stringify({ memoryId, type: 'new_memory' })
          );
        });
      }
    }

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
      const newContent = content || memory.content;
      db.prepare(`
        UPDATE memories SET title = ?, content = ?, tags = ?, visibility = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(title || memory.title, newContent, tags || memory.tags, visibility || memory.visibility, memoryId);

      // 解析并更新引用关系
      updateMemoryReferences(memoryId, newContent);

      // 通知关注者内容已更新
      const followers = db.prepare('SELECT follower_id FROM follows WHERE following_id = ?').all(userId);
      if (followers.length > 0 && memory.visibility === 'public') {
        const author = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
        followers.forEach(follower => {
          const notificationId = uuidv4();
          db.prepare(`
            INSERT INTO notifications (id, user_id, type, title, content, data)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            notificationId,
            follower.follower_id,
            'memory_updated',
            `${author?.username || '用户'}更新了记忆`,
            `${memory.title} 已更新`,
            JSON.stringify({ memoryId, type: 'memory_updated' })
          );
        });
      }
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

// ==================== Batch Operations ====================
// IMPORTANT: These routes must be before /api/memories/:id/* routes

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

// ==================== End Batch Operations ====================

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

// ===== Read Later API =====

// Add to read later
app.post('/api/memories/:id/read-later', authMiddleware, (req, res) => {
  const memoryId = req.params.id;
  const userId = req.user.id;
  const { priority = 0, notes = '' } = req.body;

  try {
    const memory = db.prepare('SELECT id FROM memories WHERE id = ?').get(memoryId);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    const existing = db.prepare('SELECT * FROM read_later WHERE user_id = ? AND memory_id = ?').get(userId, memoryId);

    if (existing) {
      db.prepare('UPDATE read_later SET priority = ?, notes = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?').run(priority, notes, existing.id);
      res.json({ success: true, message: '已更新稍后阅读', isNew: false });
    } else {
      const id = uuidv4();
      db.prepare('INSERT INTO read_later (id, user_id, memory_id, priority, notes) VALUES (?, ?, ?, ?, ?)').run(id, userId, memoryId, priority, notes);
      res.json({ success: true, message: '已加入稍后阅读', isNew: true });
    }
  } catch (error) {
    console.error('稍后阅读错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// Remove from read later
app.delete('/api/memories/:id/read-later', authMiddleware, (req, res) => {
  const memoryId = req.params.id;
  const userId = req.user.id;

  try {
    const result = db.prepare('DELETE FROM read_later WHERE user_id = ? AND memory_id = ?').run(userId, memoryId);
    if (result.changes > 0) {
      res.json({ success: true, message: '已从稍后阅读移除' });
    } else {
      res.status(404).json({ error: '未找到记录' });
    }
  } catch (error) {
    console.error('移除稍后阅读错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// Get read later list
app.get('/api/read-later', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const items = db.prepare(`
      SELECT rl.id as read_later_id, rl.priority, rl.notes, rl.created_at as added_at,
        m.id, m.title, m.content, m.tags, m.created_at, m.updated_at, m.likes_count, 
        m.bookmarks_count, m.views_count, m.comments_count, m.is_pinned,
        u.username, u.avatar
      FROM read_later rl
      JOIN memories m ON rl.memory_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE rl.user_id = ? AND m.deleted_at IS NULL
      ORDER BY rl.priority DESC, rl.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM read_later WHERE user_id = ?').get(userId).count;

    res.json({
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取稍后阅读列表错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Check if memory is in read later
app.get('/api/memories/:id/read-later', authMiddleware, (req, res) => {
  const memoryId = req.params.id;
  const userId = req.user.id;

  try {
    const item = db.prepare('SELECT * FROM read_later WHERE user_id = ? AND memory_id = ?').get(userId, memoryId);
    res.json({ inReadLater: !!item, item });
  } catch (error) {
    console.error('检查稍后阅读状态错误:', error);
    res.status(500).json({ error: '查询失败' });
  }
});

// Update read later item
app.put('/api/read-later/:id', authMiddleware, (req, res) => {
  const readLaterId = req.params.id;
  const userId = req.user.id;
  const { priority, notes } = req.body;

  try {
    const item = db.prepare('SELECT * FROM read_later WHERE id = ? AND user_id = ?').get(readLaterId, userId);
    if (!item) {
      return res.status(404).json({ error: '未找到记录' });
    }

    db.prepare('UPDATE read_later SET priority = COALESCE(?, priority), notes = COALESCE(?, notes) WHERE id = ?').run(priority, notes, readLaterId);
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新稍后阅读错误:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

// Clear all read later
app.delete('/api/read-later', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    db.prepare('DELETE FROM read_later WHERE user_id = ?').run(userId);
    res.json({ success: true, message: '已清空稍后阅读' });
  } catch (error) {
    console.error('清空稍后阅读错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// ===== Feedback API =====

// Submit feedback for a memory
app.post('/api/memories/:id/feedback', authMiddleware, (req, res) => {
  const memoryId = req.params.id;
  const userId = req.user.id;
  const { isHelpful, feedback = '' } = req.body;

  if (typeof isHelpful !== 'boolean') {
    return res.status(400).json({ error: '请提供有效的反馈' });
  }

  try {
    const memory = db.prepare('SELECT id FROM memories WHERE id = ?').get(memoryId);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    const existing = db.prepare('SELECT * FROM memory_feedback WHERE user_id = ? AND memory_id = ?').get(userId, memoryId);

    if (existing) {
      db.prepare('UPDATE memory_feedback SET is_helpful = ?, feedback = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?').run(isHelpful ? 1 : 0, feedback, existing.id);
      res.json({ success: true, message: '反馈已更新', isNew: false });
    } else {
      const id = uuidv4();
      db.prepare('INSERT INTO memory_feedback (id, user_id, memory_id, is_helpful, feedback) VALUES (?, ?, ?, ?, ?)').run(id, userId, memoryId, isHelpful ? 1 : 0, feedback);
      res.json({ success: true, message: '感谢您的反馈', isNew: true });
    }
  } catch (error) {
    console.error('提交反馈错误:', error);
    res.status(500).json({ error: '提交失败' });
  }
});

// Get feedback stats for a memory
app.get('/api/memories/:id/feedback', (req, res) => {
  const memoryId = req.params.id;

  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_helpful = 1 THEN 1 ELSE 0 END) as helpful_count,
        SUM(CASE WHEN is_helpful = 0 THEN 1 ELSE 0 END) as not_helpful_count
      FROM memory_feedback 
      WHERE memory_id = ?
    `).get(memoryId);

    res.json({
      total: stats.total || 0,
      helpfulCount: stats.helpful_count || 0,
      notHelpfulCount: stats.not_helpful_count || 0,
      helpfulRate: stats.total > 0 ? Math.round((stats.helpful_count / stats.total) * 100) : 0
    });
  } catch (error) {
    console.error('获取反馈统计错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Get user's feedback for a memory
app.get('/api/memories/:id/feedback/me', authMiddleware, (req, res) => {
  const memoryId = req.params.id;
  const userId = req.user.id;

  try {
    const feedback = db.prepare('SELECT * FROM memory_feedback WHERE user_id = ? AND memory_id = ?').get(userId, memoryId);
    res.json({ 
      hasFeedback: !!feedback, 
      isHelpful: feedback ? !!feedback.is_helpful : null,
      feedback: feedback?.feedback || ''
    });
  } catch (error) {
    console.error('获取用户反馈错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// ===== Archive API =====

// Archive a memory
app.post('/api/memories/:id/archive', authMiddleware, (req, res) => {
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

    db.prepare('UPDATE memories SET archived_at = CURRENT_TIMESTAMP WHERE id = ?').run(memoryId);
    res.json({ success: true, message: '已归档' });
  } catch (error) {
    console.error('归档错误:', error);
    res.status(500).json({ error: '归档失败' });
  }
});

// Unarchive a memory
app.delete('/api/memories/:id/archive', authMiddleware, (req, res) => {
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

    db.prepare('UPDATE memories SET archived_at = NULL WHERE id = ?').run(memoryId);
    res.json({ success: true, message: '已取消归档' });
  } catch (error) {
    console.error('取消归档错误:', error);
    res.status(500).json({ error: '取消归档失败' });
  }
});

// Get archived memories list
app.get('/api/archives', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const memories = db.prepare(`
      SELECT m.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE memory_id = m.id) as likes_count,
        (SELECT COUNT(*) FROM bookmarks WHERE memory_id = m.id) as bookmarks_count,
        (SELECT COUNT(*) FROM comments WHERE memory_id = m.id) as comments_count
      FROM memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = ? AND m.archived_at IS NOT NULL AND m.deleted_at IS NULL
      ORDER BY m.archived_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM memories WHERE user_id = ? AND archived_at IS NOT NULL AND deleted_at IS NULL').get(userId).count;

    res.json({
      memories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取归档列表错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// ===== View History API =====

// Record a view
app.post('/api/memories/:id/view', authMiddleware, (req, res) => {
  const memoryId = req.params.id;
  const userId = req.user.id;
  const { duration = 0 } = req.body;

  try {
    const memory = db.prepare('SELECT id FROM memories WHERE id = ? AND deleted_at IS NULL').get(memoryId);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    const id = uuidv4();
    db.prepare('INSERT INTO view_history (id, user_id, memory_id, view_duration) VALUES (?, ?, ?, ?)').run(id, userId, memoryId, duration);
    
    // 更新记忆的阅读量
    db.prepare('UPDATE memories SET views_count = views_count + 1 WHERE id = ?').run(memoryId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('记录浏览错误:', error);
    res.status(500).json({ error: '记录失败' });
  }
});

// Get view history
app.get('/api/history', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const history = db.prepare(`
      SELECT vh.id as history_id, vh.view_duration, vh.created_at as viewed_at,
        m.id, m.title, m.content, m.tags, m.created_at, m.likes_count, 
        m.bookmarks_count, m.views_count, m.comments_count,
        u.username, u.avatar
      FROM view_history vh
      JOIN memories m ON vh.memory_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE vh.user_id = ? AND m.deleted_at IS NULL
      ORDER BY vh.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM view_history WHERE user_id = ?').get(userId).count;

    res.json({
      history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取浏览历史错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Clear view history
app.delete('/api/history', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    db.prepare('DELETE FROM view_history WHERE user_id = ?').run(userId);
    res.json({ success: true, message: '已清空浏览历史' });
  } catch (error) {
    console.error('清空浏览历史错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// Delete single history item
app.delete('/api/history/:id', authMiddleware, (req, res) => {
  const historyId = req.params.id;
  const userId = req.user.id;

  try {
    const result = db.prepare('DELETE FROM view_history WHERE id = ? AND user_id = ?').run(historyId, userId);
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: '记录不存在' });
    }
  } catch (error) {
    console.error('删除浏览记录错误:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

// ===== Reading Progress API =====

// Save reading progress
app.post('/api/memories/:id/progress', authMiddleware, (req, res) => {
  const memoryId = req.params.id;
  const userId = req.user.id;
  const { position = 0, progress = 0 } = req.body;

  try {
    // 使用 UPSERT
    db.prepare(`
      INSERT INTO reading_progress (user_id, memory_id, position, progress, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, memory_id) 
      DO UPDATE SET position = ?, progress = ?, updated_at = CURRENT_TIMESTAMP
    `).run(userId, memoryId, position, progress, position, progress);

    res.json({ success: true });
  } catch (error) {
    console.error('保存阅读进度错误:', error);
    res.status(500).json({ error: '保存失败' });
  }
});

// Get reading progress
app.get('/api/memories/:id/progress', authMiddleware, (req, res) => {
  const memoryId = req.params.id;
  const userId = req.user.id;

  try {
    const result = db.prepare(`
      SELECT position, progress, updated_at
      FROM reading_progress
      WHERE user_id = ? AND memory_id = ?
    `).get(userId, memoryId);

    if (result) {
      res.json({
        position: result.position,
        progress: result.progress,
        updatedAt: result.updated_at
      });
    } else {
      res.json({ progress: 0, position: 0 });
    }
  } catch (error) {
    console.error('获取阅读进度错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// ===== Personalized Recommendations API =====

// Get personalized recommendations for user
app.get('/api/recommendations', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { limit = 10 } = req.query;

  try {
    // 基于用户行为的推荐算法：
    // 1. 用户点赞过的记忆的标签
    // 2. 用户收藏过的记忆的标签
    // 3. 用户阅读过的记忆的标签
    // 4. 用户关注的作者的最新记忆
    
    const recommendations = [];
    const addedIds = new Set();

    // 获取用户喜欢/收藏/阅读的记忆的标签
    const userInterests = db.prepare(`
      SELECT DISTINCT tags FROM memories m
      WHERE m.deleted_at IS NULL AND m.archived_at IS NULL
      AND (
        m.id IN (SELECT memory_id FROM likes WHERE user_id = ?)
        OR m.id IN (SELECT memory_id FROM bookmarks WHERE user_id = ?)
        OR m.id IN (SELECT memory_id FROM read_later WHERE user_id = ?)
      )
    `).all(userId, userId, userId);

    const interestTags = new Set();
    userInterests.forEach(item => {
      if (item.tags) {
        item.tags.split(',').forEach(tag => {
          if (tag.trim()) interestTags.add(tag.trim());
        });
      }
    });

    // 基于兴趣标签推荐
    if (interestTags.size > 0) {
      const tagConditions = Array.from(interestTags).map(() => 'm.tags LIKE ?').join(' OR ');
      const tagParams = Array.from(interestTags).map(tag => `%${tag}%`);
      
      const tagRecommendations = db.prepare(`
        SELECT m.*, u.username, u.avatar,
          (SELECT COUNT(*) FROM likes WHERE memory_id = m.id) as likes_count,
          (SELECT COUNT(*) FROM bookmarks WHERE memory_id = m.id) as bookmarks_count
        FROM memories m
        JOIN users u ON m.user_id = u.id
        WHERE m.deleted_at IS NULL AND m.archived_at IS NULL 
        AND m.visibility = 'public'
        AND m.user_id != ?
        AND (${tagConditions})
        ORDER BY m.created_at DESC
        LIMIT ?
      `).all(userId, ...tagParams, limit);

      tagRecommendations.forEach(m => {
        if (!addedIds.has(m.id)) {
          addedIds.add(m.id);
          recommendations.push({ ...m, reason: 'based_on_interests' });
        }
      });
    }

    // 基于关注的作者推荐
    if (recommendations.length < limit) {
      const followingAuthors = db.prepare(`
        SELECT following_id FROM follows WHERE follower_id = ?
      `).all(userId);

      if (followingAuthors.length > 0) {
        const authorIds = followingAuthors.map(f => f.following_id);
        const placeholders = authorIds.map(() => '?').join(',');
        
        const authorRecommendations = db.prepare(`
          SELECT m.*, u.username, u.avatar,
            (SELECT COUNT(*) FROM likes WHERE memory_id = m.id) as likes_count,
            (SELECT COUNT(*) FROM bookmarks WHERE memory_id = m.id) as bookmarks_count
          FROM memories m
          JOIN users u ON m.user_id = u.id
          WHERE m.deleted_at IS NULL AND m.archived_at IS NULL
          AND m.visibility = 'public'
          AND m.user_id IN (${placeholders})
          ORDER BY m.created_at DESC
          LIMIT ?
        `).all(...authorIds, limit - recommendations.length);

        authorRecommendations.forEach(m => {
          if (!addedIds.has(m.id)) {
            addedIds.add(m.id);
            recommendations.push({ ...m, reason: 'from_following' });
          }
        });
      }
    }

    // 补充热门记忆
    if (recommendations.length < limit) {
      const hotMemories = db.prepare(`
        SELECT m.*, u.username, u.avatar,
          (SELECT COUNT(*) FROM likes WHERE memory_id = m.id) as likes_count,
          (SELECT COUNT(*) FROM bookmarks WHERE memory_id = m.id) as bookmarks_count
        FROM memories m
        JOIN users u ON m.user_id = u.id
        WHERE m.deleted_at IS NULL AND m.archived_at IS NULL
        AND m.visibility = 'public'
        AND m.id NOT IN (${addedIds.size > 0 ? Array.from(addedIds).map(() => '?').join(',') : 'NULL'})
        ORDER BY m.likes_count DESC, m.created_at DESC
        LIMIT ?
      `).all(...Array.from(addedIds), limit - recommendations.length);

      hotMemories.forEach(m => {
        recommendations.push({ ...m, reason: 'trending' });
      });
    }

    res.json({ recommendations });
  } catch (error) {
    console.error('获取推荐失败:', error);
    res.status(500).json({ error: '获取推荐失败' });
  }
});

// ===== User Level & Points System =====

// 计算用户等级所需积分
const getLevelThreshold = (level) => {
  // 等级1: 0, 等级2: 100, 等级3: 300, 等级4: 600, 等级5: 1000...
  return (level * (level - 1) * 50);
};

// 根据积分计算等级
const calculateLevel = (points) => {
  let level = 1;
  while (getLevelThreshold(level + 1) <= points) {
    level++;
  }
  return level;
};

// 更新用户积分
const updateUserPoints = (userId) => {
  try {
    // 计算积分：
    // 发布记忆: 10分/篇
    // 获得点赞: 5分/个
    // 获得收藏: 8分/个
    // 发表评论: 2分/条
    // 连续签到: 额外奖励
    
    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM memories WHERE user_id = ? AND deleted_at IS NULL) * 10 as memory_points,
        (SELECT COALESCE(SUM(likes_count), 0) FROM memories WHERE user_id = ?) * 5 as like_points,
        (SELECT COALESCE(SUM(bookmarks_count), 0) FROM memories WHERE user_id = ?) * 8 as bookmark_points,
        (SELECT COUNT(*) FROM comments WHERE user_id = ?) * 2 as comment_points,
        (SELECT COUNT(*) FROM checkins WHERE user_id = ?) * 3 as checkin_points
    `).get(userId, userId, userId, userId, userId);

    const totalPoints = (stats.memory_points || 0) + (stats.like_points || 0) + 
                        (stats.bookmark_points || 0) + (stats.comment_points || 0) + 
                        (stats.checkin_points || 0);
    
    const newLevel = calculateLevel(totalPoints);
    
    db.prepare('UPDATE users SET points = ?, level = ? WHERE id = ?').run(totalPoints, newLevel, userId);
    
    return { points: totalPoints, level: newLevel };
  } catch (error) {
    console.error('更新用户积分错误:', error);
    return null;
  }
};

// Get user level info
app.get('/api/user/level', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    const result = updateUserPoints(userId);
    
    const user = db.prepare('SELECT points, level FROM users WHERE id = ?').get(userId);
    
    const currentLevel = user.level || 1;
    const currentPoints = user.points || 0;
    const nextLevelThreshold = getLevelThreshold(currentLevel + 1);
    const currentLevelThreshold = getLevelThreshold(currentLevel);
    const progress = currentLevel > 1 ? 
      Math.min(100, Math.round(((currentPoints - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100)) :
      Math.min(100, Math.round((currentPoints / nextLevelThreshold) * 100));

    res.json({
      level: currentLevel,
      points: currentPoints,
      nextLevelPoints: nextLevelThreshold,
      progress,
      pointsToNext: nextLevelThreshold - currentPoints
    });
  } catch (error) {
    console.error('获取用户等级错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Get level leaderboard
app.get('/api/leaderboard', (req, res) => {
  const { limit = 10 } = req.query;

  try {
    // 先更新所有用户的积分
    const users = db.prepare('SELECT id FROM users').all();
    users.forEach(u => updateUserPoints(u.id));
    
    const leaderboard = db.prepare(`
      SELECT id, username, avatar, points, level
      FROM users
      ORDER BY points DESC
      LIMIT ?
    `).all(parseInt(limit));

    res.json({ leaderboard });
  } catch (error) {
    console.error('获取排行榜错误:', error);
    res.status(500).json({ error: '获取失败' });
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

// ===== Comment Reactions API =====

// Add reaction to comment
app.post('/api/comments/:id/reactions', authMiddleware, (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.id;
  const { emoji } = req.body;

  const allowedEmojis = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];
  if (!emoji || !allowedEmojis.includes(emoji)) {
    return res.status(400).json({ error: '无效的表情' });
  }

  try {
    // 检查评论是否存在
    const comment = db.prepare('SELECT id FROM comments WHERE id = ?').get(commentId);
    if (!comment) {
      return res.status(404).json({ error: '评论不存在' });
    }

    // 检查是否已反应
    const existing = db.prepare('SELECT * FROM comment_reactions WHERE user_id = ? AND comment_id = ? AND emoji = ?').get(userId, commentId, emoji);

    if (existing) {
      // 取消反应
      db.prepare('DELETE FROM comment_reactions WHERE id = ?').run(existing.id);
    } else {
      // 添加反应
      const id = uuidv4();
      db.prepare('INSERT INTO comment_reactions (id, user_id, comment_id, emoji) VALUES (?, ?, ?, ?)').run(id, userId, commentId, emoji);
    }

    // 获取该评论的所有反应统计
    const reactions = db.prepare(`
      SELECT emoji, COUNT(*) as count
      FROM comment_reactions
      WHERE comment_id = ?
      GROUP BY emoji
    `).all(commentId);

    // 获取当前用户的反应
    const userReactions = db.prepare(`
      SELECT emoji FROM comment_reactions WHERE user_id = ? AND comment_id = ?
    `).all(userId, commentId).map(r => r.emoji);

    res.json({
      reactions: reactions.reduce((acc, r) => {
        acc[r.emoji] = r.count;
        return acc;
      }, {}),
      userReactions
    });
  } catch (error) {
    console.error('评论反应错误:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// Get reactions for a comment
app.get('/api/comments/:id/reactions', (req, res) => {
  const commentId = req.params.id;

  try {
    const reactions = db.prepare(`
      SELECT emoji, COUNT(*) as count
      FROM comment_reactions
      WHERE comment_id = ?
      GROUP BY emoji
    `).all(commentId);

    res.json({
      reactions: reactions.reduce((acc, r) => {
        acc[r.emoji] = r.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('获取评论反应错误:', error);
    res.status(500).json({ error: '获取失败' });
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

// Get current user's memories
app.get('/api/user/memories', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    const memories = db.prepare(`
      SELECT m.*, 
        (SELECT COUNT(*) FROM likes WHERE memory_id = m.id) as likes_count,
        (SELECT COUNT(*) FROM bookmarks WHERE memory_id = m.id) as bookmarks_count,
        (SELECT COUNT(*) FROM comments WHERE memory_id = m.id) as comments_count
      FROM memories m
      WHERE m.user_id = ? AND m.deleted_at IS NULL
      ORDER BY m.is_pinned DESC, m.created_at DESC
    `).all(userId);

    res.json(memories);
  } catch (error) {
    console.error('获取用户记忆失败:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Get current user's bookmarks
app.get('/api/user/bookmarks', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    const bookmarks = db.prepare(`
      SELECT m.*, u.username,
        (SELECT COUNT(*) FROM likes WHERE memory_id = m.id) as likes_count,
        (SELECT COUNT(*) FROM bookmarks WHERE memory_id = m.id) as bookmarks_count,
        (SELECT COUNT(*) FROM comments WHERE memory_id = m.id) as comments_count
      FROM bookmarks b
      JOIN memories m ON b.memory_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE b.user_id = ? AND m.deleted_at IS NULL
      ORDER BY b.created_at DESC
    `).all(userId);

    res.json(bookmarks);
  } catch (error) {
    console.error('获取用户收藏失败:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Get user follow stats
app.get('/api/user/follow-stats/:id', (req, res) => {
  const targetId = req.params.id;

  try {
    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as followingCount,
        (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followersCount
    `).get(targetId, targetId);

    res.json(stats || { followingCount: 0, followersCount: 0 });
  } catch (error) {
    console.error('获取关注统计失败:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Daily check-in (POST)
app.post('/api/user/checkin', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Check if already checked in today
    const existing = db.prepare('SELECT * FROM sign_ins WHERE user_id = ? AND checkin_date = ?').get(userId, today);
    if (existing) {
      return res.status(400).json({ error: '今天已经签到过了', alreadyCheckedIn: true });
    }

    // Calculate streak
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastSignIn = db.prepare('SELECT streak FROM sign_ins WHERE user_id = ? AND checkin_date = ?').get(userId, yesterday);

    const streak = lastSignIn ? lastSignIn.streak + 1 : 1;
    const signInId = uuidv4();

    db.prepare('INSERT INTO sign_ins (id, user_id, checkin_date, streak) VALUES (?, ?, ?, ?)').run(signInId, userId, today, streak);

    // Get total check-ins
    const totalCheckins = db.prepare('SELECT COUNT(*) as count FROM sign_ins WHERE user_id = ?').get(userId);

    res.json({
      message: '签到成功',
      checkin: {
        streak,
        totalCheckins: totalCheckins.count
      }
    });
  } catch (error) {
    console.error('签到错误:', error);
    res.status(500).json({ error: '签到失败' });
  }
});

// Get check-in status (GET)
app.get('/api/user/checkin', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  try {
    const todaySignIn = db.prepare('SELECT * FROM sign_ins WHERE user_id = ? AND checkin_date = ?').get(userId, today);
    
    // Get current streak (from most recent check-in)
    const lastSignIn = db.prepare('SELECT streak FROM sign_ins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 1').get(userId);
    
    // Get max streak
    const maxStreakResult = db.prepare('SELECT MAX(streak) as maxStreak FROM sign_ins WHERE user_id = ?').get(userId);
    
    // Get total check-ins
    const totalCheckins = db.prepare('SELECT COUNT(*) as count FROM sign_ins WHERE user_id = ?').get(userId);

    // Check if streak is still valid (consecutive days)
    let currentStreak = lastSignIn?.streak || 0;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const yesterdaySignIn = db.prepare('SELECT * FROM sign_ins WHERE user_id = ? AND checkin_date = ?').get(userId, yesterday);
    
    // If not signed in today or yesterday, reset streak to 0
    if (!todaySignIn && !yesterdaySignIn) {
      currentStreak = 0;
    }

    res.json({
      checkedInToday: !!todaySignIn,
      currentStreak,
      maxStreak: maxStreakResult?.maxStreak || 0,
      totalCheckins: totalCheckins.count || 0
    });
  } catch (error) {
    console.error('获取签到状态错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Get check-in history
app.get('/api/user/checkin/history', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const days = parseInt(req.query.days) || 30;

  try {
    const checkins = db.prepare(`
      SELECT checkin_date, streak 
      FROM sign_ins 
      WHERE user_id = ? 
      ORDER BY checkin_date DESC 
      LIMIT ?
    `).all(userId, days);

    res.json({ checkins });
  } catch (error) {
    console.error('获取签到历史错误:', error);
    res.status(500).json({ error: '获取签到历史失败' });
  }
});

// Get check-in leaderboard
app.get('/api/checkin/leaderboard', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  try {
    // 获取每个用户最新的签到记录（按连续天数排序）
    const leaderboard = db.prepare(`
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
    `).all(limit);

    res.json({ leaderboard });
  } catch (error) {
    console.error('获取签到排行榜错误:', error);
    res.status(500).json({ error: '获取签到排行榜失败' });
  }
});

// ==================== Analytics Routes ====================

// Get user analytics dashboard data
app.get('/api/user/analytics', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { period = 'month' } = req.query;

  try {
    // 计算时间范围
    const now = new Date();
    let startDate;
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    const startDateStr = startDate.toISOString().split('T')[0];

    // 1. 记忆创建趋势（按日期分组）
    const memoryTrend = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM memories
      WHERE user_id = ? AND deleted_at IS NULL AND created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(userId, startDateStr);

    // 2. 标签使用统计
    const tagUsage = db.prepare(`
      SELECT tags FROM memories
      WHERE user_id = ? AND deleted_at IS NULL AND tags IS NOT NULL AND tags != ''
    `).all(userId);

    // 解析标签并统计
    const tagCounts = {};
    tagUsage.forEach(row => {
      try {
        const tags = JSON.parse(row.tags);
        tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      } catch (e) {}
    });
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // 3. 记忆活跃时段统计（按小时）
    const hourlyActivity = db.prepare(`
      SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count
      FROM memories
      WHERE user_id = ? AND deleted_at IS NULL
      GROUP BY hour
      ORDER BY hour ASC
    `).all(userId);

    // 4. 内容统计
    const contentStats = db.prepare(`
      SELECT
        COUNT(*) as total_memories,
        SUM(CASE WHEN visibility = 'public' THEN 1 ELSE 0 END) as public_count,
        SUM(CASE WHEN visibility = 'private' THEN 1 ELSE 0 END) as private_count,
        SUM(views_count) as total_views,
        AVG(views_count) as avg_views
      FROM memories
      WHERE user_id = ? AND deleted_at IS NULL
    `).get(userId);

    // 5. 互动统计
    const engagementStats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM likes WHERE memory_id IN (SELECT id FROM memories WHERE user_id = ?)) as total_likes_received,
        (SELECT COUNT(*) FROM bookmarks WHERE memory_id IN (SELECT id FROM memories WHERE user_id = ?)) as total_bookmarks_received,
        (SELECT COUNT(*) FROM comments WHERE memory_id IN (SELECT id FROM memories WHERE user_id = ?)) as total_comments_received
    `).get(userId, userId, userId);

    // 6. 收藏夹统计
    const collectionStats = db.prepare(`
      SELECT COUNT(*) as total_collections
      FROM collections
      WHERE user_id = ?
    `).get(userId);

    // 7. 系列统计
    const seriesStats = db.prepare(`
      SELECT COUNT(*) as total_series
      FROM series
      WHERE user_id = ?
    `).get(userId);

    // 8. 本周/本月新增
    const weeklyNew = db.prepare(`
      SELECT COUNT(*) as count FROM memories
      WHERE user_id = ? AND deleted_at IS NULL AND created_at >= datetime('now', '-7 days')
    `).get(userId);

    const monthlyNew = db.prepare(`
      SELECT COUNT(*) as count FROM memories
      WHERE user_id = ? AND deleted_at IS NULL AND created_at >= datetime('now', '-30 days')
    `).get(userId);

    res.json({
      period,
      memoryTrend,
      topTags,
      hourlyActivity,
      contentStats: {
        total: contentStats.total_memories || 0,
        public: contentStats.public_count || 0,
        private: contentStats.private_count || 0,
        totalViews: contentStats.total_views || 0,
        avgViews: Math.round(contentStats.avg_views || 0)
      },
      engagement: {
        likesReceived: engagementStats.total_likes_received || 0,
        bookmarksReceived: engagementStats.total_bookmarks_received || 0,
        commentsReceived: engagementStats.total_comments_received || 0
      },
      collections: collectionStats.total_collections || 0,
      series: seriesStats.total_series || 0,
      recentActivity: {
        weekly: weeklyNew.count || 0,
        monthly: monthlyNew.count || 0
      }
    });
  } catch (error) {
    console.error('获取分析数据错误:', error);
    res.status(500).json({ error: '获取分析数据失败' });
  }
});

// ==================== Milestone Routes ====================

// Create a milestone
app.post('/api/milestones', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { title, description, targetDate } = req.body;
  
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: '标题不能为空' });
  }
  
  const milestoneId = uuidv4();
  
  try {
    db.prepare(`
      INSERT INTO milestones (id, user_id, title, description, target_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(milestoneId, userId, title.trim(), description || null, targetDate || null);
    
    const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(milestoneId);
    res.json({ message: '里程碑创建成功', milestone });
  } catch (error) {
    console.error('创建里程碑错误:', error);
    res.status(500).json({ error: '创建里程碑失败' });
  }
});

// Get user's milestones
app.get('/api/milestones', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { status } = req.query;
  
  try {
    let sql = `
      SELECT m.*, 
        (SELECT COUNT(*) FROM milestone_memories WHERE milestone_id = m.id) as memory_count
      FROM milestones m
      WHERE m.user_id = ?
    `;
    const params = [userId];
    
    if (status) {
      sql += ' AND m.status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY m.created_at DESC';
    
    const milestones = db.prepare(sql).all(...params);
    res.json({ milestones });
  } catch (error) {
    console.error('获取里程碑列表错误:', error);
    res.status(500).json({ error: '获取里程碑列表失败' });
  }
});

// Get a single milestone with memories
app.get('/api/milestones/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  try {
    const milestone = db.prepare(`
      SELECT m.*, 
        (SELECT COUNT(*) FROM milestone_memories WHERE milestone_id = m.id) as memory_count
      FROM milestones m
      WHERE m.id = ? AND m.user_id = ?
    `).get(id, userId);
    
    if (!milestone) {
      return res.status(404).json({ error: '里程碑不存在' });
    }
    
    // Get associated memories
    const memories = db.prepare(`
      SELECT mem.id, mem.title, mem.tags, mem.created_at, mm.added_at
      FROM milestone_memories mm
      JOIN memories mem ON mm.memory_id = mem.id
      WHERE mm.milestone_id = ?
      ORDER BY mm.added_at DESC
    `).all(id);
    
    res.json({ milestone, memories });
  } catch (error) {
    console.error('获取里程碑错误:', error);
    res.status(500).json({ error: '获取里程碑失败' });
  }
});

// Update a milestone
app.put('/api/milestones/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { title, description, targetDate, status } = req.body;
  
  try {
    const existing = db.prepare('SELECT * FROM milestones WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: '里程碑不存在' });
    }
    
    db.prepare(`
      UPDATE milestones 
      SET title = ?, description = ?, target_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || existing.title,
      description !== undefined ? description : existing.description,
      targetDate !== undefined ? targetDate : existing.target_date,
      status || existing.status,
      id
    );
    
    const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(id);
    res.json({ message: '里程碑更新成功', milestone });
  } catch (error) {
    console.error('更新里程碑错误:', error);
    res.status(500).json({ error: '更新里程碑失败' });
  }
});

// Delete a milestone
app.delete('/api/milestones/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  try {
    const existing = db.prepare('SELECT * FROM milestones WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: '里程碑不存在' });
    }
    
    // Delete associated memories first
    db.prepare('DELETE FROM milestone_memories WHERE milestone_id = ?').run(id);
    db.prepare('DELETE FROM milestones WHERE id = ?').run(id);
    
    res.json({ message: '里程碑已删除' });
  } catch (error) {
    console.error('删除里程碑错误:', error);
    res.status(500).json({ error: '删除里程碑失败' });
  }
});

// Add memory to milestone
app.post('/api/milestones/:id/memories', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { memoryId } = req.body;
  const userId = req.user.id;
  
  if (!memoryId) {
    return res.status(400).json({ error: '记忆ID不能为空' });
  }
  
  try {
    const milestone = db.prepare('SELECT * FROM milestones WHERE id = ? AND user_id = ?').get(id, userId);
    if (!milestone) {
      return res.status(404).json({ error: '里程碑不存在' });
    }
    
    const memory = db.prepare('SELECT * FROM memories WHERE id = ? AND deleted_at IS NULL').get(memoryId);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }
    
    const linkId = uuidv4();
    db.prepare(`
      INSERT OR IGNORE INTO milestone_memories (id, milestone_id, memory_id)
      VALUES (?, ?, ?)
    `).run(linkId, id, memoryId);
    
    res.json({ message: '已添加到里程碑' });
  } catch (error) {
    console.error('添加记忆到里程碑错误:', error);
    res.status(500).json({ error: '添加失败' });
  }
});

// Remove memory from milestone
app.delete('/api/milestones/:id/memories/:memoryId', authMiddleware, (req, res) => {
  const { id, memoryId } = req.params;
  const userId = req.user.id;
  
  try {
    db.prepare(`
      DELETE FROM milestone_memories 
      WHERE milestone_id = ? AND memory_id = ?
    `).run(id, memoryId);
    
    res.json({ message: '已从里程碑移除' });
  } catch (error) {
    console.error('移除记忆错误:', error);
    res.status(500).json({ error: '移除失败' });
  }
});

// ==================== Memory Lock Routes ====================

// Lock a memory
app.post('/api/memories/:id/lock', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { password } = req.body;
  
  if (!password || password.length < 4) {
    return res.status(400).json({ error: '密码至少需要4个字符' });
  }
  
  try {
    const memory = db.prepare('SELECT * FROM memories WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(id, userId);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }
    
    if (memory.is_locked) {
      return res.status(400).json({ error: '记忆已锁定' });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    db.prepare(`
      UPDATE memories SET is_locked = 1, lock_password = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(passwordHash, id);
    
    res.json({ message: '记忆已锁定' });
  } catch (error) {
    console.error('锁定记忆错误:', error);
    res.status(500).json({ error: '锁定失败' });
  }
});

// Unlock a memory
app.post('/api/memories/:id/unlock', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { password } = req.body;
  
  try {
    const memory = db.prepare('SELECT * FROM memories WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(id, userId);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }
    
    if (!memory.is_locked) {
      return res.status(400).json({ error: '记忆未锁定' });
    }
    
    const isValid = await bcrypt.compare(password, memory.lock_password);
    if (!isValid) {
      return res.status(401).json({ error: '密码错误' });
    }
    
    db.prepare(`
      UPDATE memories SET is_locked = 0, lock_password = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
    
    res.json({ message: '记忆已解锁' });
  } catch (error) {
    console.error('解锁记忆错误:', error);
    res.status(500).json({ error: '解锁失败' });
  }
});

// Verify lock password (for viewing locked memory)
app.post('/api/memories/:id/verify-lock', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  
  try {
    const memory = db.prepare('SELECT * FROM memories WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }
    
    if (!memory.is_locked) {
      return res.json({ verified: true });
    }
    
    const isValid = await bcrypt.compare(password, memory.lock_password);
    if (!isValid) {
      return res.status(401).json({ error: '密码错误' });
    }
    
    // 返回记忆内容（不包含锁定密码）
    res.json({ 
      verified: true,
      memory: {
        id: memory.id,
        title: memory.title,
        content: memory.content,
        tags: memory.tags
      }
    });
  } catch (error) {
    console.error('验证密码错误:', error);
    res.status(500).json({ error: '验证失败' });
  }
});

// Change lock password
app.put('/api/memories/:id/lock-password', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { oldPassword, newPassword } = req.body;
  
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: '新密码至少需要4个字符' });
  }
  
  try {
    const memory = db.prepare('SELECT * FROM memories WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(id, userId);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }
    
    if (!memory.is_locked) {
      return res.status(400).json({ error: '记忆未锁定' });
    }
    
    const isValid = await bcrypt.compare(oldPassword, memory.lock_password);
    if (!isValid) {
      return res.status(401).json({ error: '原密码错误' });
    }
    
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    db.prepare(`
      UPDATE memories SET lock_password = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(passwordHash, id);
    
    res.json({ message: '密码已更新' });
  } catch (error) {
    console.error('更新密码错误:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

// ==================== Content Analysis Routes ====================

const { analyzeContentQuality, generateSummary, extractKeywords } = require('./utils/contentAnalyzer');

// Analyze content quality
app.post('/api/memories/analyze', authMiddleware, (req, res) => {
  const { title, content, tags } = req.body;
  
  try {
    const analysis = analyzeContentQuality(title, content, tags);
    const summary = generateSummary(content);
    const keywords = extractKeywords(title, content);
    
    res.json({
      quality: analysis,
      summary,
      keywords
    });
  } catch (error) {
    console.error('分析内容错误:', error);
    res.status(500).json({ error: '分析失败' });
  }
});

// Get content quality for existing memory
app.get('/api/memories/:id/analyze', optionalAuth, (req, res) => {
  const { id } = req.params;
  
  try {
    const memory = db.prepare(`
      SELECT m.*, GROUP_CONCAT(DISTINCT t.name) as tag_names
      FROM memories m
      LEFT JOIN (
        SELECT memory_id, json_extract(value, '$.name') as name
        FROM memories, json_each(tags)
      ) t ON m.id = t.memory_id
      WHERE m.id = ? AND m.deleted_at IS NULL
      GROUP BY m.id
    `).get(id);
    
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }
    
    // 检查可见性
    if (memory.visibility !== 'public') {
      if (!req.user || req.user.id !== memory.user_id) {
        return res.status(403).json({ error: '无权访问此记忆' });
      }
    }
    
    let tags = [];
    if (memory.tags) {
      try {
        tags = JSON.parse(memory.tags);
      } catch (e) {}
    }
    
    const analysis = analyzeContentQuality(memory.title, memory.content, tags);
    const summary = generateSummary(memory.content);
    const keywords = extractKeywords(memory.title, memory.content);
    
    res.json({
      quality: analysis,
      summary,
      keywords
    });
  } catch (error) {
    console.error('分析内容错误:', error);
    res.status(500).json({ error: '分析失败' });
  }
});

// Get writing suggestions
app.get('/api/writing-suggestions', (req, res) => {
  res.json({
    suggestions: [
      {
        category: '标题优化',
        tips: [
          '使用5-50字的描述性标题',
          '标题应包含关键信息',
          '避免过于笼统的标题如"笔记"或"记录"'
        ]
      },
      {
        category: '内容结构',
        tips: [
          '使用标题(#)组织内容',
          '将长内容分成多个段落',
          '使用列表展示要点'
        ]
      },
      {
        category: '标签使用',
        tips: [
          '添加3-7个相关标签',
          '使用具体而非笼统的标签',
          '保持标签命名一致性'
        ]
      },
      {
        category: '内容丰富',
        tips: [
          '添加相关链接',
          '使用代码块展示代码',
          '添加图片说明复杂概念'
        ]
      }
    ]
  });
});

// ==================== Rating Routes ====================

// Rate a memory
app.post('/api/memories/:id/rate', authMiddleware, (req, res) => {
  const { id: memoryId } = req.params;
  const userId = req.user.id;
  const { rating, review } = req.body;
  
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: '评分必须在 1-5 之间' });
  }
  
  try {
    // 检查记忆是否存在
    const memory = db.prepare('SELECT id FROM memories WHERE id = ? AND deleted_at IS NULL').get(memoryId);
    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }
    
    const ratingId = uuidv4();
    
    // Upsert 评分
    db.prepare(`
      INSERT INTO ratings (id, memory_id, user_id, rating, review)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(memory_id, user_id) DO UPDATE SET 
        rating = excluded.rating,
        review = excluded.review,
        updated_at = CURRENT_TIMESTAMP
    `).run(ratingId, memoryId, userId, rating, review || null);
    
    // 获取更新后的评分统计
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_ratings,
        AVG(rating) as avg_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM ratings WHERE memory_id = ?
    `).get(memoryId);
    
    res.json({ 
      message: '评分成功',
      rating: parseInt(rating),
      stats: {
        ...stats,
        avg_rating: Math.round(stats.avg_rating * 10) / 10
      }
    });
  } catch (error) {
    console.error('评分错误:', error);
    res.status(500).json({ error: '评分失败' });
  }
});

// Get memory ratings
app.get('/api/memories/:id/ratings', optionalAuth, (req, res) => {
  const { id: memoryId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const offset = (pageNum - 1) * limitNum;
  
  try {
    // 获取评分统计
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_ratings,
        AVG(rating) as avg_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM ratings WHERE memory_id = ?
    `).get(memoryId);
    
    // 获取评分列表
    const ratings = db.prepare(`
      SELECT r.*, u.username, u.avatar
      FROM ratings r
      JOIN users u ON r.user_id = u.id
      WHERE r.memory_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(memoryId, limitNum, offset);
    
    // 获取当前用户的评分
    let userRating = null;
    if (req.user) {
      userRating = db.prepare(`
        SELECT rating, review FROM ratings WHERE memory_id = ? AND user_id = ?
      `).get(memoryId, req.user.id);
    }
    
    res.json({
      stats: {
        ...stats,
        avg_rating: stats.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0
      },
      ratings,
      userRating: userRating ? userRating.rating : null,
      userReview: userRating ? userRating.review : null,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: stats.total_ratings || 0
      }
    });
  } catch (error) {
    console.error('获取评分错误:', error);
    res.status(500).json({ error: '获取评分失败' });
  }
});

// Delete rating
app.delete('/api/memories/:id/rate', authMiddleware, (req, res) => {
  const { id: memoryId } = req.params;
  const userId = req.user.id;
  
  try {
    const existing = db.prepare('SELECT * FROM ratings WHERE memory_id = ? AND user_id = ?').get(memoryId, userId);
    if (!existing) {
      return res.status(404).json({ error: '评分不存在' });
    }
    
    db.prepare('DELETE FROM ratings WHERE memory_id = ? AND user_id = ?').run(memoryId, userId);
    
    res.json({ message: '评分已删除' });
  } catch (error) {
    console.error('删除评分错误:', error);
    res.status(500).json({ error: '删除评分失败' });
  }
});

// ==================== Reminder Routes ====================

// Create a reminder
app.post('/api/reminders', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { memoryId, title, content, reminderType, reminderDate, repeatInterval } = req.body;
  
  if (!title || !reminderDate) {
    return res.status(400).json({ error: '标题和提醒时间是必填项' });
  }
  
  const reminderId = uuidv4();
  
  try {
    db.prepare(`
      INSERT INTO reminders (id, user_id, memory_id, title, content, reminder_type, reminder_date, repeat_interval)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(reminderId, userId, memoryId || null, title, content || null, reminderType || 'once', reminderDate, repeatInterval || null);
    
    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(reminderId);
    res.json({ message: '提醒创建成功', reminder });
  } catch (error) {
    console.error('创建提醒错误:', error);
    res.status(500).json({ error: '创建提醒失败' });
  }
});

// Get user's reminders
app.get('/api/reminders', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { status = 'all' } = req.query;
  
  try {
    let sql = 'SELECT r.*, m.title as memory_title FROM reminders r LEFT JOIN memories m ON r.memory_id = m.id WHERE r.user_id = ?';
    const params = [userId];
    
    if (status === 'pending') {
      sql += ' AND r.is_completed = 0 AND datetime(r.reminder_date) > datetime("now")';
    } else if (status === 'overdue') {
      sql += ' AND r.is_completed = 0 AND datetime(r.reminder_date) <= datetime("now")';
    } else if (status === 'completed') {
      sql += ' AND r.is_completed = 1';
    }
    
    sql += ' ORDER BY r.reminder_date ASC';
    
    const reminders = db.prepare(sql).all(...params);
    res.json({ reminders });
  } catch (error) {
    console.error('获取提醒列表错误:', error);
    res.status(500).json({ error: '获取提醒列表失败' });
  }
});

// Get a single reminder
app.get('/api/reminders/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  try {
    const reminder = db.prepare(`
      SELECT r.*, m.title as memory_title 
      FROM reminders r 
      LEFT JOIN memories m ON r.memory_id = m.id 
      WHERE r.id = ? AND r.user_id = ?
    `).get(id, userId);
    
    if (!reminder) {
      return res.status(404).json({ error: '提醒不存在' });
    }
    
    res.json({ reminder });
  } catch (error) {
    console.error('获取提醒错误:', error);
    res.status(500).json({ error: '获取提醒失败' });
  }
});

// Update a reminder
app.put('/api/reminders/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { title, content, reminderType, reminderDate, repeatInterval } = req.body;
  
  try {
    const existing = db.prepare('SELECT * FROM reminders WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: '提醒不存在' });
    }
    
    db.prepare(`
      UPDATE reminders 
      SET title = ?, content = ?, reminder_type = ?, reminder_date = ?, repeat_interval = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || existing.title,
      content !== undefined ? content : existing.content,
      reminderType || existing.reminder_type,
      reminderDate || existing.reminder_date,
      repeatInterval !== undefined ? repeatInterval : existing.repeat_interval,
      id
    );
    
    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
    res.json({ message: '提醒更新成功', reminder });
  } catch (error) {
    console.error('更新提醒错误:', error);
    res.status(500).json({ error: '更新提醒失败' });
  }
});

// Complete a reminder
app.post('/api/reminders/:id/complete', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  try {
    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ? AND user_id = ?').get(id, userId);
    if (!reminder) {
      return res.status(404).json({ error: '提醒不存在' });
    }
    
    if (reminder.reminder_type === 'recurring' && reminder.repeat_interval) {
      // 对于重复提醒，计算下一次提醒时间
      const currentDate = new Date(reminder.reminder_date);
      let nextDate;
      
      switch (reminder.repeat_interval) {
        case 'daily':
          nextDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          nextDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          nextDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
          break;
        case 'yearly':
          nextDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1));
          break;
        default:
          nextDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      }
      
      db.prepare(`
        UPDATE reminders 
        SET reminder_date = ?, last_triggered = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(nextDate.toISOString(), id);
    } else {
      // 一次性提醒标记为完成
      db.prepare('UPDATE reminders SET is_completed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    }
    
    const updated = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
    res.json({ message: '提醒已完成', reminder: updated });
  } catch (error) {
    console.error('完成提醒错误:', error);
    res.status(500).json({ error: '完成提醒失败' });
  }
});

// Delete a reminder
app.delete('/api/reminders/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  try {
    const existing = db.prepare('SELECT * FROM reminders WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: '提醒不存在' });
    }
    
    db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
    res.json({ message: '提醒已删除' });
  } catch (error) {
    console.error('删除提醒错误:', error);
    res.status(500).json({ error: '删除提醒失败' });
  }
});

// Get due reminders (for notification check)
app.get('/api/reminders/due', authMiddleware, (req, res) => {
  const userId = req.user.id;
  
  try {
    const dueReminders = db.prepare(`
      SELECT r.*, m.title as memory_title 
      FROM reminders r 
      LEFT JOIN memories m ON r.memory_id = m.id 
      WHERE r.user_id = ? 
        AND r.is_completed = 0 
        AND datetime(r.reminder_date) <= datetime("now", "+5 minutes")
        AND datetime(r.reminder_date) > datetime(r.last_triggered || "+1 hour", "now")
    `).all(userId);
    
    res.json({ reminders: dueReminders });
  } catch (error) {
    console.error('获取到期提醒错误:', error);
    res.status(500).json({ error: '获取到期提醒失败' });
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

    res.json({ series });
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

// Get all tags with stats (for management)
app.get('/api/tags/all', authMiddleware, (req, res) => {
  const userId = req.user.id;
  
  try {
    // 获取用户的所有标签
    const memories = db.prepare(`
      SELECT tags FROM memories 
      WHERE user_id = ? AND deleted_at IS NULL AND tags IS NOT NULL AND tags != ''
    `).all(userId);
    
    const tagStats = {};
    memories.forEach(m => {
      try {
        const tags = JSON.parse(m.tags);
        tags.forEach(tag => {
          if (!tagStats[tag]) {
            tagStats[tag] = { name: tag, count: 0 };
          }
          tagStats[tag].count++;
        });
      } catch (e) {
        // 处理旧格式
        m.tags.split(',').forEach(tag => {
          tag = tag.trim();
          if (tag) {
            if (!tagStats[tag]) {
              tagStats[tag] = { name: tag, count: 0 };
            }
            tagStats[tag].count++;
          }
        });
      }
    });
    
    const sortedTags = Object.values(tagStats).sort((a, b) => b.count - a.count);
    res.json({ tags: sortedTags });
  } catch (error) {
    console.error('获取标签列表错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Rename a tag
app.put('/api/tags/:oldName/rename', authMiddleware, (req, res) => {
  const { oldName } = req.params;
  const { newName } = req.body;
  const userId = req.user.id;
  
  if (!newName || newName.trim() === '') {
    return res.status(400).json({ error: '新标签名不能为空' });
  }
  
  try {
    // 获取用户所有包含该标签的记忆
    const memories = db.prepare(`
      SELECT id, tags FROM memories 
      WHERE user_id = ? AND tags LIKE ?
    `).all(userId, `%"${oldName}"%`);
    
    if (memories.length === 0) {
      return res.status(404).json({ error: '标签不存在' });
    }
    
    // 更新每个记忆的标签
    memories.forEach(memory => {
      try {
        const tags = JSON.parse(memory.tags);
        const newTags = tags.map(t => t === oldName ? newName.trim() : t);
        db.prepare('UPDATE memories SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(JSON.stringify(newTags), memory.id);
      } catch (e) {
        // 处理旧格式
        const tags = memory.tags.split(',').map(t => t.trim());
        const newTags = tags.map(t => t === oldName ? newName.trim() : t);
        db.prepare('UPDATE memories SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(JSON.stringify(newTags.filter(t => t)), memory.id);
      }
    });
    
    res.json({ message: '标签重命名成功', oldName, newName: newName.trim(), affectedCount: memories.length });
  } catch (error) {
    console.error('重命名标签错误:', error);
    res.status(500).json({ error: '重命名失败' });
  }
});

// Merge tags
app.post('/api/tags/merge', authMiddleware, (req, res) => {
  const { sourceTags, targetTag } = req.body;
  const userId = req.user.id;
  
  if (!sourceTags || !Array.isArray(sourceTags) || sourceTags.length === 0) {
    return res.status(400).json({ error: '源标签列表不能为空' });
  }
  
  if (!targetTag || targetTag.trim() === '') {
    return res.status(400).json({ error: '目标标签不能为空' });
  }
  
  try {
    let affectedCount = 0;
    
    sourceTags.forEach(sourceTag => {
      if (sourceTag === targetTag) return;
      
      const memories = db.prepare(`
        SELECT id, tags FROM memories 
        WHERE user_id = ? AND tags LIKE ?
      `).all(userId, `%"${sourceTag}"%`);
      
      memories.forEach(memory => {
        try {
          const tags = JSON.parse(memory.tags);
          // 移除源标签，如果目标标签不存在则添加
          const newTags = tags.filter(t => t !== sourceTag);
          if (!newTags.includes(targetTag)) {
            newTags.push(targetTag);
          }
          db.prepare('UPDATE memories SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(JSON.stringify(newTags), memory.id);
          affectedCount++;
        } catch (e) {}
      });
    });
    
    res.json({ message: '标签合并成功', targetTag, affectedCount });
  } catch (error) {
    console.error('合并标签错误:', error);
    res.status(500).json({ error: '合并失败' });
  }
});

// Delete a tag from all memories
app.delete('/api/tags/:tagName', authMiddleware, (req, res) => {
  const { tagName } = req.params;
  const userId = req.user.id;
  
  try {
    const memories = db.prepare(`
      SELECT id, tags FROM memories 
      WHERE user_id = ? AND tags LIKE ?
    `).all(userId, `%"${tagName}"%`);
    
    memories.forEach(memory => {
      try {
        const tags = JSON.parse(memory.tags);
        const newTags = tags.filter(t => t !== tagName);
        db.prepare('UPDATE memories SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(JSON.stringify(newTags), memory.id);
      } catch (e) {}
    });
    
    res.json({ message: '标签已删除', tagName, affectedCount: memories.length });
  } catch (error) {
    console.error('删除标签错误:', error);
    res.status(500).json({ error: '删除失败' });
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

// ==================== Tag Follow Routes ====================

// Follow a tag
app.post('/api/tags/:tag/follow', authMiddleware, (req, res) => {
  const { tag } = req.params;
  const userId = req.user.id;

  if (!tag || !tag.trim()) {
    return res.status(400).json({ error: '标签不能为空' });
  }

  const normalizedTag = tag.trim().toLowerCase();

  try {
    // Check if already following
    const existing = db.prepare('SELECT * FROM tag_follows WHERE user_id = ? AND tag = ?').get(userId, normalizedTag);
    if (existing) {
      return res.status(400).json({ error: '已经关注了此标签' });
    }

    const followId = uuidv4();
    db.prepare('INSERT INTO tag_follows (id, user_id, tag) VALUES (?, ?, ?)').run(followId, userId, normalizedTag);

    res.json({ message: '关注成功', tag: normalizedTag });
  } catch (error) {
    console.error('关注标签错误:', error);
    res.status(500).json({ error: '关注失败' });
  }
});

// Unfollow a tag
app.delete('/api/tags/:tag/follow', authMiddleware, (req, res) => {
  const { tag } = req.params;
  const userId = req.user.id;

  const normalizedTag = tag.trim().toLowerCase();

  try {
    const result = db.prepare('DELETE FROM tag_follows WHERE user_id = ? AND tag = ?').run(userId, normalizedTag);

    if (result.changes === 0) {
      return res.status(400).json({ error: '未关注此标签' });
    }

    res.json({ message: '已取消关注' });
  } catch (error) {
    console.error('取消关注标签错误:', error);
    res.status(500).json({ error: '取消关注失败' });
  }
});

// Check if following a tag
app.get('/api/tags/:tag/following', authMiddleware, (req, res) => {
  const { tag } = req.params;
  const userId = req.user.id;

  const normalizedTag = tag.trim().toLowerCase();

  try {
    const existing = db.prepare('SELECT * FROM tag_follows WHERE user_id = ? AND tag = ?').get(userId, normalizedTag);
    res.json({ following: !!existing });
  } catch (error) {
    console.error('检查标签关注状态错误:', error);
    res.status(500).json({ error: '检查失败' });
  }
});

// Get user's followed tags
app.get('/api/tags/followed', authMiddleware, (req, res) => {
  const userId = req.user.id;

  try {
    const tags = db.prepare(`
      SELECT tf.tag, tf.created_at,
        (SELECT COUNT(*) FROM memories WHERE tags LIKE '%' || tf.tag || '%' AND visibility = 'public' AND deleted_at IS NULL) as memories_count
      FROM tag_follows tf
      WHERE tf.user_id = ?
      ORDER BY tf.created_at DESC
    `).all(userId);

    res.json(tags);
  } catch (error) {
    console.error('获取关注标签列表错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Get memories from followed tags
app.get('/api/tags/followed-memories', optionalAuth, (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const offset = (pageNum - 1) * limitNum;

  if (!req.user) {
    return res.status(401).json({ error: '请先登录' });
  }

  const userId = req.user.id;

  try {
    // Get followed tags
    const followedTags = db.prepare('SELECT tag FROM tag_follows WHERE user_id = ?').all(userId);

    if (followedTags.length === 0) {
      return res.json({
        memories: [],
        pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 }
      });
    }

    const tags = followedTags.map(t => t.tag);

    // Build query to find memories with any of the followed tags
    const tagConditions = tags.map(() => "m.tags LIKE '%' || ? || '%'").join(' OR ');
    const tagParams = tags;

    // Get total count
    const countSql = `
      SELECT COUNT(DISTINCT m.id) as total
      FROM memories m
      WHERE m.deleted_at IS NULL
        AND m.visibility = 'public'
        AND (${tagConditions})
    `;
    const countResult = db.prepare(countSql).get(...tagParams);
    const total = countResult.total;
    const totalPages = Math.ceil(total / limitNum);

    // Get memories
    const sql = `
      SELECT DISTINCT m.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE memory_id = m.id) as likes_count,
        (SELECT COUNT(*) FROM bookmarks WHERE memory_id = m.id) as bookmarks_count,
        (SELECT COUNT(*) FROM comments WHERE memory_id = m.id) as comments_count
      FROM memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.deleted_at IS NULL
        AND m.visibility = 'public'
        AND (${tagConditions})
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const memories = db.prepare(sql).all(...tagParams, limitNum, offset);

    // Add matched tags info
    const memoriesWithTags = memories.map(memory => {
      const memoryTags = memory.tags ? memory.tags.split(',').filter(Boolean).map(t => t.trim().toLowerCase()) : [];
      const matchedTags = memoryTags.filter(t => tags.includes(t));
      return { ...memory, matched_tags: matchedTags };
    });

    res.json({
      memories: memoriesWithTags,
      pagination: { page: pageNum, limit: limitNum, total, totalPages }
    });
  } catch (error) {
    console.error('获取关注标签记忆错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// ==================== Moments (沸点) Routes ====================

// Get moments list
app.get('/api/moments', optionalAuth, (req, res) => {
  const { page = 1, limit = 10, topic } = req.query;
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const offset = (pageNum - 1) * limitNum;

  try {
    let countSql, sql, countParams = [], params = [];

    if (topic) {
      // Filter by topic
      countSql = `SELECT COUNT(*) as total FROM moments WHERE topics LIKE '%' || ? || '%'`;
      countParams = [topic];
      sql = `
        SELECT m.*, u.username, u.avatar,
          (SELECT COUNT(*) FROM moment_likes WHERE moment_id = m.id) as likes_count,
          (SELECT COUNT(*) FROM moment_comments WHERE moment_id = m.id) as comments_count
        FROM moments m
        JOIN users u ON m.user_id = u.id
        WHERE m.topics LIKE '%' || ? || '%'
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [topic, limitNum, offset];
    } else {
      countSql = `SELECT COUNT(*) as total FROM moments`;
      sql = `
        SELECT m.*, u.username, u.avatar,
          (SELECT COUNT(*) FROM moment_likes WHERE moment_id = m.id) as likes_count,
          (SELECT COUNT(*) FROM moment_comments WHERE moment_id = m.id) as comments_count
        FROM moments m
        JOIN users u ON m.user_id = u.id
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [limitNum, offset];
    }

    const countResult = db.prepare(countSql).get(...countParams);
    const total = countResult.total;
    const totalPages = Math.ceil(total / limitNum);

    const moments = db.prepare(sql).all(...params);

    // Check if user liked each moment
    let momentsWithLikeStatus = moments;
    if (req.user) {
      const userId = req.user.id;
      momentsWithLikeStatus = moments.map(moment => {
        const liked = db.prepare('SELECT 1 FROM moment_likes WHERE user_id = ? AND moment_id = ?').get(userId, moment.id);
        return { ...moment, is_liked: !!liked };
      });
    }

    res.json({
      moments: momentsWithLikeStatus,
      pagination: { page: pageNum, limit: limitNum, total, totalPages }
    });
  } catch (error) {
    console.error('获取沸点列表错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Get single moment
app.get('/api/moments/:id', optionalAuth, (req, res) => {
  const { id } = req.params;

  try {
    const moment = db.prepare(`
      SELECT m.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM moment_likes WHERE moment_id = m.id) as likes_count,
        (SELECT COUNT(*) FROM moment_comments WHERE moment_id = m.id) as comments_count
      FROM moments m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).get(id);

    if (!moment) {
      return res.status(404).json({ error: '沸点不存在' });
    }

    // Check if user liked
    if (req.user) {
      const liked = db.prepare('SELECT 1 FROM moment_likes WHERE user_id = ? AND moment_id = ?').get(req.user.id, id);
      moment.is_liked = !!liked;
    }

    res.json(moment);
  } catch (error) {
    console.error('获取沸点详情错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Create moment
app.post('/api/moments', authMiddleware, upload.array('images', 9), (req, res) => {
  const { content, topics } = req.body;
  const userId = req.user.id;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: '内容不能为空' });
  }

  if (content.length > 500) {
    return res.status(400).json({ error: '内容不能超过500字' });
  }

  try {
    const momentId = uuidv4();
    
    // Process uploaded images
    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`).join(',') : '';
    
    // Process topics (hashtags)
    const topicsStr = topics ? topics : '';

    db.prepare(`
      INSERT INTO moments (id, user_id, content, images, topics)
      VALUES (?, ?, ?, ?, ?)
    `).run(momentId, userId, content.trim(), images, topicsStr);

    const moment = db.prepare(`
      SELECT m.*, u.username, u.avatar
      FROM moments m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).get(momentId);

    res.status(201).json(moment);
  } catch (error) {
    console.error('创建沸点错误:', error);
    res.status(500).json({ error: '发布失败' });
  }
});

// Delete moment
app.delete('/api/moments/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const moment = db.prepare('SELECT * FROM moments WHERE id = ?').get(id);
    
    if (!moment) {
      return res.status(404).json({ error: '沸点不存在' });
    }

    if (moment.user_id !== userId) {
      return res.status(403).json({ error: '无权删除此沸点' });
    }

    // Delete related data
    db.prepare('DELETE FROM moment_likes WHERE moment_id = ?').run(id);
    db.prepare('DELETE FROM moment_comments WHERE moment_id = ?').run(id);
    db.prepare('DELETE FROM moments WHERE id = ?').run(id);

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除沸点错误:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

// Like moment
app.post('/api/moments/:id/like', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const moment = db.prepare('SELECT id FROM moments WHERE id = ?').get(id);
    if (!moment) {
      return res.status(404).json({ error: '沸点不存在' });
    }

    const existing = db.prepare('SELECT * FROM moment_likes WHERE user_id = ? AND moment_id = ?').get(userId, id);
    if (existing) {
      return res.status(400).json({ error: '已经点赞过了' });
    }

    db.prepare('INSERT INTO moment_likes (id, user_id, moment_id) VALUES (?, ?, ?)').run(uuidv4(), userId, id);

    const likesCount = db.prepare('SELECT COUNT(*) as count FROM moment_likes WHERE moment_id = ?').get(id);

    res.json({ message: '点赞成功', likes_count: likesCount.count });
  } catch (error) {
    console.error('点赞沸点错误:', error);
    res.status(500).json({ error: '点赞失败' });
  }
});

// Unlike moment
app.delete('/api/moments/:id/like', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = db.prepare('DELETE FROM moment_likes WHERE user_id = ? AND moment_id = ?').run(userId, id);

    if (result.changes === 0) {
      return res.status(400).json({ error: '尚未点赞' });
    }

    const likesCount = db.prepare('SELECT COUNT(*) as count FROM moment_likes WHERE moment_id = ?').get(id);

    res.json({ message: '已取消点赞', likes_count: likesCount.count });
  } catch (error) {
    console.error('取消点赞沸点错误:', error);
    res.status(500).json({ error: '取消点赞失败' });
  }
});

// Get moment comments
app.get('/api/moments/:id/comments', (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const offset = (pageNum - 1) * limitNum;

  try {
    const comments = db.prepare(`
      SELECT mc.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM moment_comment_likes WHERE comment_id = mc.id) as likes_count
      FROM moment_comments mc
      JOIN users u ON mc.user_id = u.id
      WHERE mc.moment_id = ?
      ORDER BY mc.created_at DESC
      LIMIT ? OFFSET ?
    `).all(id, limitNum, offset);

    res.json(comments);
  } catch (error) {
    console.error('获取沸点评论错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Add moment comment
app.post('/api/moments/:id/comments', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }

  if (content.length > 200) {
    return res.status(400).json({ error: '评论不能超过200字' });
  }

  try {
    const moment = db.prepare('SELECT id FROM moments WHERE id = ?').get(id);
    if (!moment) {
      return res.status(404).json({ error: '沸点不存在' });
    }

    const commentId = uuidv4();
    db.prepare(`
      INSERT INTO moment_comments (id, moment_id, user_id, content)
      VALUES (?, ?, ?, ?)
    `).run(commentId, id, userId, content.trim());

    const comment = db.prepare(`
      SELECT mc.*, u.username, u.avatar
      FROM moment_comments mc
      JOIN users u ON mc.user_id = u.id
      WHERE mc.id = ?
    `).get(commentId);

    res.status(201).json(comment);
  } catch (error) {
    console.error('添加沸点评论错误:', error);
    res.status(500).json({ error: '评论失败' });
  }
});

// Delete moment comment
app.delete('/api/moments/:momentId/comments/:commentId', authMiddleware, (req, res) => {
  const { momentId, commentId } = req.params;
  const userId = req.user.id;

  try {
    const comment = db.prepare('SELECT * FROM moment_comments WHERE id = ? AND moment_id = ?').get(commentId, momentId);
    
    if (!comment) {
      return res.status(404).json({ error: '评论不存在' });
    }

    if (comment.user_id !== userId) {
      return res.status(403).json({ error: '无权删除此评论' });
    }

    db.prepare('DELETE FROM moment_comment_likes WHERE comment_id = ?').run(commentId);
    db.prepare('DELETE FROM moment_comments WHERE id = ?').run(commentId);

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除沸点评论错误:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

// Like moment comment
app.post('/api/moments/:momentId/comments/:commentId/like', authMiddleware, (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;

  try {
    const existing = db.prepare('SELECT * FROM moment_comment_likes WHERE user_id = ? AND comment_id = ?').get(userId, commentId);
    if (existing) {
      return res.status(400).json({ error: '已经点赞过了' });
    }

    db.prepare('INSERT INTO moment_comment_likes (id, user_id, comment_id) VALUES (?, ?, ?)').run(uuidv4(), userId, commentId);

    res.json({ message: '点赞成功' });
  } catch (error) {
    console.error('点赞评论错误:', error);
    res.status(500).json({ error: '点赞失败' });
  }
});

// Unlike moment comment
app.delete('/api/moments/:momentId/comments/:commentId/like', authMiddleware, (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;

  try {
    db.prepare('DELETE FROM moment_comment_likes WHERE user_id = ? AND comment_id = ?').run(userId, commentId);
    res.json({ message: '已取消点赞' });
  } catch (error) {
    console.error('取消点赞评论错误:', error);
    res.status(500).json({ error: '取消点赞失败' });
  }
});

// Get hot topics
app.get('/api/moments/topics/hot', (req, res) => {
  const { limit = 10 } = req.query;

  try {
    // Extract all topics from moments and count
    const moments = db.prepare("SELECT topics FROM moments WHERE topics IS NOT NULL AND topics != ''").all();
    
    const topicCounts = {};
    moments.forEach(m => {
      if (m.topics) {
        const topics = m.topics.split(',').filter(Boolean);
        topics.forEach(t => {
          const topic = t.trim().toLowerCase();
          if (topic) {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          }
        });
      }
    });

    // Sort by count and return top N
    const sortedTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, parseInt(limit) || 10)
      .map(([name, count]) => ({ name, count }));

    res.json(sortedTopics);
  } catch (error) {
    console.error('获取热门话题错误:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// Get user's moments
app.get('/api/users/:id/moments', (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const offset = (pageNum - 1) * limitNum;

  try {
    const moments = db.prepare(`
      SELECT m.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM moment_likes WHERE moment_id = m.id) as likes_count,
        (SELECT COUNT(*) FROM moment_comments WHERE moment_id = m.id) as comments_count
      FROM moments m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).all(id, limitNum, offset);

    res.json(moments);
  } catch (error) {
    console.error('获取用户沸点错误:', error);
    res.status(500).json({ error: '获取失败' });
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