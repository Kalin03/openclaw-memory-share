// 标签智能推荐工具
// 基于关键词提取和内容分析推荐相关标签

// 预定义标签分类
const TAG_CATEGORIES = {
  技术: ['JavaScript', 'Python', 'React', 'Vue', 'Node.js', 'TypeScript', 'CSS', 'HTML', 'Git', 'Docker', 'Kubernetes', 'Linux', 'Go', 'Rust', 'Java', 'Spring', '数据库', 'Redis', 'MongoDB', 'MySQL'],
  AI: ['AI', '机器学习', '深度学习', 'GPT', 'LLM', 'NLP', '计算机视觉', 'TensorFlow', 'PyTorch', 'ChatGPT', 'Claude', '人工智能', '自动化'],
  产品: ['产品设计', '用户体验', 'UI', 'UX', '交互设计', '原型', '需求分析', '敏捷开发', 'Scrum', 'PM', '产品经理'],
  运营: ['运营', '增长', '数据分析', 'SEO', '内容营销', '社群运营', '用户增长', '转化率', 'A/B测试'],
  管理: ['管理', '团队协作', '领导力', '项目管理', 'OKR', 'KPI', '时间管理', '效率工具'],
  生活: ['生活', '读书', '电影', '音乐', '旅行', '美食', '健身', '摄影', '游戏'],
  职场: ['职场', '面试', '简历', '职业规划', '跳槽', '薪资', '工作', '求职'],
  其他: ['经验', '分享', '教程', '笔记', '总结', '思考', '随笔']
};

// 关键词到标签的映射
const KEYWORD_TAG_MAP = {
  // 技术关键词
  'javascript': ['JavaScript', '前端'],
  'python': ['Python', '后端'],
  'react': ['React', '前端', 'JavaScript'],
  'vue': ['Vue', '前端', 'JavaScript'],
  'node': ['Node.js', '后端', 'JavaScript'],
  'typescript': ['TypeScript', '前端', 'JavaScript'],
  'css': ['CSS', '前端'],
  'html': ['HTML', '前端'],
  'git': ['Git', '版本控制'],
  'docker': ['Docker', 'DevOps'],
  'kubernetes': ['Kubernetes', 'DevOps'],
  'linux': ['Linux', '运维'],
  'go': ['Go', '后端'],
  'rust': ['Rust', '后端'],
  'java': ['Java', '后端'],
  'spring': ['Spring', 'Java', '后端'],
  'database': ['数据库'],
  'sql': ['数据库', 'SQL'],
  'redis': ['Redis', '数据库'],
  'mongodb': ['MongoDB', '数据库'],
  'mysql': ['MySQL', '数据库'],
  
  // AI关键词
  'ai': ['AI', '人工智能'],
  'artificial intelligence': ['AI', '人工智能'],
  'machine learning': ['机器学习', 'AI'],
  'deep learning': ['深度学习', 'AI'],
  'gpt': ['GPT', 'AI', 'LLM'],
  'llm': ['LLM', 'AI', 'GPT'],
  'nlp': ['NLP', 'AI'],
  'chatgpt': ['ChatGPT', 'AI', 'GPT'],
  'claude': ['Claude', 'AI'],
  'tensorflow': ['TensorFlow', 'AI', '机器学习'],
  'pytorch': ['PyTorch', 'AI', '机器学习'],
  
  // 产品关键词
  'product': ['产品设计', '产品经理'],
  'ux': ['UX', '用户体验'],
  'ui': ['UI', '界面设计'],
  'design': ['设计'],
  'user experience': ['用户体验', 'UX'],
  'prototype': ['原型', '产品设计'],
  'agile': ['敏捷开发'],
  'scrum': ['Scrum', '敏捷开发'],
  
  // 运营关键词
  'marketing': ['营销', '运营'],
  'growth': ['增长', '运营'],
  'seo': ['SEO', '运营'],
  'analytics': ['数据分析'],
  'data analysis': ['数据分析'],
  'conversion': ['转化率', '运营'],
  'a/b test': ['A/B测试', '运营'],
  
  // 管理关键词
  'management': ['管理'],
  'team': ['团队协作', '管理'],
  'leadership': ['领导力', '管理'],
  'project': ['项目管理'],
  'okr': ['OKR', '管理'],
  'kpi': ['KPI', '管理'],
  'productivity': ['效率工具', '时间管理'],
  'time management': ['时间管理'],
  
  // 生活关键词
  'book': ['读书', '生活'],
  'movie': ['电影', '生活'],
  'music': ['音乐', '生活'],
  'travel': ['旅行', '生活'],
  'food': ['美食', '生活'],
  'fitness': ['健身', '生活'],
  'photo': ['摄影', '生活'],
  'game': ['游戏', '生活'],
  
  // 职场关键词
  'interview': ['面试', '职场'],
  'resume': ['简历', '职场'],
  'career': ['职业规划', '职场'],
  'job': ['求职', '职场'],
  'salary': ['薪资', '职场'],
  
  // 通用关键词
  'tutorial': ['教程'],
  'guide': ['教程', '指南'],
  'tips': ['经验', '技巧'],
  'experience': ['经验', '分享'],
  'summary': ['总结'],
  'thought': ['思考', '随笔'],
  'note': ['笔记'],
  'review': ['复盘', '总结']
};

// 从内容提取关键词
function extractKeywords(content) {
  if (!content) return [];
  
  const text = content.toLowerCase();
  const keywords = [];
  
  // 提取英文关键词
  const englishWords = text.match(/[a-z]+/g) || [];
  keywords.push(...englishWords.filter(w => w.length > 2));
  
  // 提取中文关键词（简单分词）
  const chineseWords = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  keywords.push(...chineseWords);
  
  return [...new Set(keywords)];
}

// 计算标签相关性得分
function calculateTagRelevance(content, title) {
  const fullText = `${title || ''} ${content || ''}`.toLowerCase();
  const scores = {};
  
  // 基于关键词映射
  Object.entries(KEYWORD_TAG_MAP).forEach(([keyword, tags]) => {
    if (fullText.includes(keyword.toLowerCase())) {
      tags.forEach(tag => {
        scores[tag] = (scores[tag] || 0) + 1;
      });
    }
  });
  
  // 检查标题中是否直接包含标签词
  Object.keys(TAG_CATEGORIES).forEach(category => {
    TAG_CATEGORIES[category].forEach(tag => {
      if (title && title.toLowerCase().includes(tag.toLowerCase())) {
        scores[tag] = (scores[tag] || 0) + 2;
      }
    });
  });
  
  return scores;
}

// 主函数：推荐标签
export function recommendTags(content, title, existingTags = []) {
  const scores = calculateTagRelevance(content, title);
  
  // 转换为排序数组
  const recommendations = Object.entries(scores)
    .filter(([tag]) => !existingTags.includes(tag))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, score]) => ({
      tag,
      score,
      category: findCategory(tag)
    }));
  
  return recommendations;
}

// 查找标签所属分类
function findCategory(tag) {
  for (const [category, tags] of Object.entries(TAG_CATEGORIES)) {
    if (tags.includes(tag)) {
      return category;
    }
  }
  return '其他';
}

// 获取相关标签
export function getRelatedTags(tag) {
  const category = findCategory(tag);
  return TAG_CATEGORIES[category] || [];
}

// 导出所有标签
export function getAllTags() {
  const allTags = [];
  Object.values(TAG_CATEGORIES).forEach(tags => {
    allTags.push(...tags);
  });
  return [...new Set(allTags)];
}

// 导出标签分类
export { TAG_CATEGORIES };