/**
 * 内容质量分析工具
 * 分析记忆内容质量并给出改进建议
 */

/**
 * 分析内容质量
 * @param {string} title - 记忆标题
 * @param {string} content - 记忆内容
 * @param {string[]} tags - 标签数组
 * @returns {Object} 质量评分和改进建议
 */
const analyzeContentQuality = (title, content, tags = []) => {
  const result = {
    score: 0,
    maxScore: 100,
    breakdown: {},
    suggestions: []
  };

  // 1. 标题质量 (20分)
  const titleScore = analyzeTitle(title);
  result.breakdown.title = titleScore;
  result.score += titleScore.score;

  if (titleScore.suggestions.length > 0) {
    result.suggestions.push(...titleScore.suggestions);
  }

  // 2. 内容长度 (20分)
  const lengthScore = analyzeContentLength(content);
  result.breakdown.length = lengthScore;
  result.score += lengthScore.score;

  if (lengthScore.suggestions.length > 0) {
    result.suggestions.push(...lengthScore.suggestions);
  }

  // 3. 内容结构 (20分)
  const structureScore = analyzeStructure(content);
  result.breakdown.structure = structureScore;
  result.score += structureScore.score;

  if (structureScore.suggestions.length > 0) {
    result.suggestions.push(...structureScore.suggestions);
  }

  // 4. 标签质量 (15分)
  const tagScore = analyzeTags(tags, content);
  result.breakdown.tags = tagScore;
  result.score += tagScore.score;

  if (tagScore.suggestions.length > 0) {
    result.suggestions.push(...tagScore.suggestions);
  }

  // 5. 可读性 (15分)
  const readabilityScore = analyzeReadability(content);
  result.breakdown.readability = readabilityScore;
  result.score += readabilityScore.score;

  if (readabilityScore.suggestions.length > 0) {
    result.suggestions.push(...readabilityScore.suggestions);
  }

  // 6. 多媒体丰富度 (10分)
  const mediaScore = analyzeMedia(content);
  result.breakdown.media = mediaScore;
  result.score += mediaScore.score;

  if (mediaScore.suggestions.length > 0) {
    result.suggestions.push(...mediaScore.suggestions);
  }

  return result;
};

/**
 * 分析标题质量
 */
const analyzeTitle = (title) => {
  const result = { score: 0, maxScore: 20, suggestions: [] };

  if (!title || title.trim() === '') {
    result.suggestions.push('💡 添加一个描述性的标题可以提升内容可发现性');
    return result;
  }

  const titleLength = title.trim().length;

  // 长度评分
  if (titleLength >= 5 && titleLength <= 50) {
    result.score += 10;
  } else if (titleLength < 5) {
    result.score += 3;
    result.suggestions.push('💡 标题太短，建议添加更多描述信息');
  } else {
    result.score += 6;
    result.suggestions.push('💡 标题较长，考虑精简到50字以内');
  }

  // 关键词评分
  const hasKeywords = /[\u4e00-\u9fa5]{2,}/.test(title); // 包含中文关键词
  if (hasKeywords) {
    result.score += 5;
  }

  // 是否使用特殊字符
  const hasSpecialChars = /[!！?？。.]/.test(title);
  if (hasSpecialChars) {
    result.score += 5;
  } else if (titleLength > 0) {
    result.score += 3;
  }

  return result;
};

/**
 * 分析内容长度
 */
const analyzeContentLength = (content) => {
  const result = { score: 0, maxScore: 20, suggestions: [] };

  if (!content || content.trim() === '') {
    result.suggestions.push('💡 添加内容可以提升记忆价值');
    return result;
  }

  const cleanContent = content.replace(/<[^>]+>/g, '').replace(/```[\s\S]*?```/g, '');
  const length = cleanContent.length;

  if (length >= 200 && length <= 2000) {
    result.score = 20;
  } else if (length >= 100 && length < 200) {
    result.score = 15;
    result.suggestions.push('💡 内容适中，可以添加更多细节');
  } else if (length >= 50 && length < 100) {
    result.score = 10;
    result.suggestions.push('💡 内容较短，建议扩展到200字以上');
  } else if (length < 50) {
    result.score = 5;
    result.suggestions.push('💡 内容太少，建议添加更多有价值的信息');
  } else if (length > 2000 && length <= 5000) {
    result.score = 18;
    result.suggestions.push('💡 内容丰富，考虑分段或拆分成多个记忆');
  } else {
    result.score = 15;
    result.suggestions.push('💡 内容很长，建议使用标题和分段提高可读性');
  }

  return result;
};

/**
 * 分析内容结构
 */
const analyzeStructure = (content) => {
  const result = { score: 0, maxScore: 20, suggestions: [] };

  if (!content || content.trim() === '') {
    return result;
  }

  // 检查段落
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
  if (paragraphs.length >= 2 && paragraphs.length <= 10) {
    result.score += 8;
  } else if (paragraphs.length === 1) {
    result.score += 3;
    result.suggestions.push('💡 分段可以提高内容可读性');
  } else {
    result.score += 6;
  }

  // 检查标题
  const hasHeadings = /^#{1,6}\s/m.test(content);
  if (hasHeadings) {
    result.score += 6;
  } else if (paragraphs.length > 3) {
    result.suggestions.push('💡 添加标题(使用 #)可以改善内容结构');
  }

  // 检查列表
  const hasLists = /^[-*+]\s|^$\d+\.\s/m.test(content);
  if (hasLists) {
    result.score += 6;
  }

  return result;
};

/**
 * 分析标签质量
 */
const analyzeTags = (tags, content) => {
  const result = { score: 0, maxScore: 15, suggestions: [] };

  const tagCount = tags ? tags.length : 0;

  if (tagCount >= 3 && tagCount <= 7) {
    result.score = 15;
  } else if (tagCount === 1 || tagCount === 2) {
    result.score = 10;
    result.suggestions.push('💡 添加更多标签可以提升内容可发现性');
  } else if (tagCount === 0) {
    result.suggestions.push('💡 添加3-5个标签可以帮助分类和搜索');
  } else {
    result.score = 12;
    result.suggestions.push('💡 标签较多，建议精简到3-7个核心标签');
  }

  return result;
};

/**
 * 分析可读性
 */
const analyzeReadability = (content) => {
  const result = { score: 0, maxScore: 15, suggestions: [] };

  if (!content || content.trim() === '') {
    return result;
  }

  const cleanContent = content.replace(/<[^>]+>/g, '').replace(/```[\s\S]*?```/g, '');

  // 检查句子长度
  const sentences = cleanContent.split(/[。！？!?.]/).filter(s => s.trim());
  const avgSentenceLength = sentences.length > 0 
    ? sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length 
    : 0;

  if (avgSentenceLength > 0 && avgSentenceLength <= 100) {
    result.score += 8;
  } else if (avgSentenceLength > 100) {
    result.score += 4;
    result.suggestions.push('💡 句子较长，考虑拆分提高可读性');
  }

  // 检查是否使用标点
  const hasPunctuation = /[，。！？、；：""''（）]/.test(cleanContent);
  if (hasPunctuation) {
    result.score += 7;
  } else if (cleanContent.length > 50) {
    result.suggestions.push('💡 使用标点符号可以提高内容可读性');
  }

  return result;
};

/**
 * 分析多媒体内容
 */
const analyzeMedia = (content) => {
  const result = { score: 0, maxScore: 10, suggestions: [] };

  if (!content) {
    return result;
  }

  // 检查图片
  const hasImages = /!\[.*?\]\(.*?\)|<img\s/.test(content);
  if (hasImages) {
    result.score += 4;
  }

  // 检查链接
  const hasLinks = /\[.*?\]\(.*?\)|<a\s/.test(content);
  if (hasLinks) {
    result.score += 3;
  }

  // 检查代码块
  const hasCode = /```[\s\S]*?```|`[^`]+`/.test(content);
  if (hasCode) {
    result.score += 3;
  }

  if (result.score === 0 && content.length > 100) {
    result.suggestions.push('💡 添加图片、链接或代码块可以丰富内容');
  }

  return result;
};

/**
 * 生成内容摘要
 * @param {string} content - 内容
 * @param {number} maxLength - 最大长度
 * @returns {string} 摘要
 */
const generateSummary = (content, maxLength = 150) => {
  if (!content || content.trim() === '') {
    return '';
  }

  // 移除 Markdown 语法
  let cleanContent = content
    .replace(/```[\s\S]*?```/g, '') // 代码块
    .replace(/`[^`]+`/g, '') // 行内代码
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 链接
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // 图片
    .replace(/^#{1,6}\s+/gm, '') // 标题
    .replace(/\*\*([^*]+)\*\*/g, '$1') // 加粗
    .replace(/\*([^*]+)\*/g, '$1') // 斜体
    .replace(/<[^>]+>/g, '') // HTML标签
    .replace(/\s+/g, ' ') // 多个空格
    .trim();

  if (cleanContent.length <= maxLength) {
    return cleanContent;
  }

  // 截取到句子结尾
  let summary = cleanContent.substring(0, maxLength);
  const lastPunctuation = Math.max(
    summary.lastIndexOf('。'),
    summary.lastIndexOf('！'),
    summary.lastIndexOf('？'),
    summary.lastIndexOf('.'),
    summary.lastIndexOf('!'),
    summary.lastIndexOf('?')
  );

  if (lastPunctuation > maxLength * 0.5) {
    summary = summary.substring(0, lastPunctuation + 1);
  } else {
    summary = summary + '...';
  }

  return summary;
};

/**
 * 提取关键词
 * @param {string} title - 标题
 * @param {string} content - 内容
 * @param {number} count - 提取数量
 * @returns {string[]} 关键词数组
 */
const extractKeywords = (title, content, count = 5) => {
  const text = `${title || ''} ${content || ''}`;
  
  // 中文分词（简单实现）
  const chineseWords = text.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
  
  // 英文单词
  const englishWords = text.match(/[a-zA-Z]{3,}/gi) || [];
  
  // 合并并统计频率
  const wordFreq = {};
  [...chineseWords, ...englishWords].forEach(word => {
    const lower = word.toLowerCase();
    wordFreq[lower] = (wordFreq[lower] || 0) + 1;
  });
  
  // 停用词
  const stopWords = ['的', '了', '是', '在', '有', '和', '与', '或', '这', '那', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just'];
  
  // 过滤停用词并排序
  const keywords = Object.entries(wordFreq)
    .filter(([word]) => !stopWords.includes(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word);
  
  return keywords;
};

module.exports = {
  analyzeContentQuality,
  generateSummary,
  extractKeywords
};