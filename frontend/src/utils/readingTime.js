// Calculate reading time in minutes
export const calculateReadingTime = (text, wordsPerMinute = 250) => {
  if (!text) return 0;
  
  // Remove markdown syntax
  let cleanText = text
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Keep link text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
    .replace(/^#{1,6}\s+/gm, '') // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/__([^_]+)__/g, '$1') // Remove bold
    .replace(/_([^_]+)_/g, '$1') // Remove italic
    .replace(/^>\s+/gm, '') // Remove quotes
    .replace(/^[-*+]\s+/gm, '') // Remove list markers
    .replace(/^\d+\.\s+/gm, '') // Remove numbered lists
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .trim();
  
  // Count Chinese characters (each character is a "word")
  const chineseChars = (cleanText.match(/[\u4e00-\u9fa5]/g) || []).length;
  
  // Count English words (approximate)
  const englishWords = cleanText
    .replace(/[\u4e00-\u9fa5]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0).length;
  
  // Total words (Chinese chars count as words, English words count normally)
  const totalWords = chineseChars + englishWords;
  
  // Calculate minutes
  const minutes = totalWords / wordsPerMinute;
  
  return Math.max(1, Math.ceil(minutes));
};

// Format reading time for display
export const formatReadingTime = (minutes) => {
  if (minutes < 1) return '不到1分钟';
  if (minutes === 1) return '1分钟';
  if (minutes < 60) return `${minutes}分钟`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}小时`;
  }
  return `${hours}小时${remainingMinutes}分钟`;
};

// Get word count
export const getWordCount = (text) => {
  if (!text) return { characters: 0, words: 0, chinese: 0, english: 0 };
  
  // Remove markdown like in reading time calculation
  let cleanText = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/<[^>]+>/g, '')
    .trim();
  
  // Count Chinese characters
  const chinese = (cleanText.match(/[\u4e00-\u9fa5]/g) || []).length;
  
  // Count English words
  const englishWords = cleanText
    .replace(/[\u4e00-\u9fa5]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
  const english = englishWords.length;
  
  // Total characters (excluding spaces)
  const characters = cleanText.replace(/\s/g, '').length;
  
  // Total words
  const words = chinese + english;
  
  return { characters, words, chinese, english };
};

// React component for reading time display
import React from 'react';
import { Clock, FileText } from 'lucide-react';

export const ReadingTimeBadge = ({ text, showWordCount = false }) => {
  const minutes = calculateReadingTime(text);
  const wordCount = getWordCount(text);
  
  return (
    <div className="inline-flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
      <span className="flex items-center gap-1">
        <Clock size={12} />
        {formatReadingTime(minutes)}
      </span>
      {showWordCount && (
        <span className="flex items-center gap-1">
          <FileText size={12} />
          {wordCount.words} 字
        </span>
      )}
    </div>
  );
};

export default ReadingTimeBadge;