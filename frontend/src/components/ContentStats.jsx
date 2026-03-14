import React from 'react';
import { FileText, Clock, Eye } from 'lucide-react';

const ContentStats = ({ content, title }) => {
  if (!content) return null;

  // 计算字数（中文按字计算，英文按单词计算）
  const calculateWordCount = (text) => {
    if (!text) return 0;
    
    // 移除Markdown标记
    const cleanText = text.replace(/[#*`_\[\]]/g, '').replace(/\n+/g, ' ');
    
    // 中文字符
    const chineseChars = (cleanText.match(/[\u4e00-\u9fa5]/g) || []).length;
    
    // 英文单词
    const englishWords = (cleanText.match(/[a-zA-Z]+/g) || []).length;
    
    // 数字
    const numbers = (cleanText.match(/\d+/g) || []).length;
    
    return chineseChars + englishWords + numbers;
  };

  // 计算阅读时间（假设每分钟阅读300字）
  const calculateReadTime = (wordCount) => {
    const minutes = Math.ceil(wordCount / 300);
    return minutes < 1 ? '不到1分钟' : `${minutes}分钟`;
  };

  // 计算段落数
  const calculateParagraphs = (text) => {
    if (!text) return 0;
    return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  };

  const wordCount = calculateWordCount(content);
  const readTime = calculateReadTime(wordCount);
  const paragraphs = calculateParagraphs(content);
  const charCount = content.length;

  return (
    <div 
      className="flex flex-wrap items-center gap-4 text-sm py-2"
      style={{ color: 'var(--text-secondary)' }}
    >
      <div className="flex items-center gap-1.5">
        <FileText size={14} />
        <span>{wordCount.toLocaleString()} 字</span>
      </div>
      
      <div className="flex items-center gap-1.5">
        <span className="font-mono">{charCount.toLocaleString()}</span>
        <span>字符</span>
      </div>
      
      <div className="flex items-center gap-1.5">
        <Clock size={14} />
        <span>阅读 {readTime}</span>
      </div>
      
      <div className="flex items-center gap-1.5">
        <span>{paragraphs} 段落</span>
      </div>
    </div>
  );
};

export default ContentStats;