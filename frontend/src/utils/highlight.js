/**
 * 高亮文本中的关键词
 * @param {string} text - 原始文本
 * @param {string} query - 搜索关键词
 * @returns {string} - 带高亮标记的文本
 */
export const highlightText = (text, query) => {
  if (!query || !text) return text;
  
  // 转义正则特殊字符
  const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // 创建不区分大小写的正则表达式
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  
  // 替换匹配的关键词为高亮标记
  return text.replace(regex, '<mark class="highlight">$1</mark>');
};

/**
 * 检查是否为搜索模式
 * @param {string} searchQuery - 当前搜索查询
 * @returns {boolean}
 */
export const isSearchMode = (searchQuery) => {
  return searchQuery && searchQuery.trim().length > 0;
};
