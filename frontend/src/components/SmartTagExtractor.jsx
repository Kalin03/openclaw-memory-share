import React, { useState } from 'react';
import { 
  Tag, 
  Sparkles, 
  Plus, 
  X, 
  Loader2,
  Lightbulb
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

/**
 * 标签智能提取组件
 * 基于内容自动推荐相关标签
 */
const SmartTagExtractor = ({ content, existingTags = [], onTagsAdd }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 常见技术关键词库
  const techKeywords = {
    // 前端
    'react': ['React', '前端', 'JavaScript'],
    'vue': ['Vue', '前端', 'JavaScript'],
    'angular': ['Angular', '前端', 'TypeScript'],
    'javascript': ['JavaScript', '前端', '编程'],
    'typescript': ['TypeScript', '前端', '编程'],
    'css': ['CSS', '前端', '样式'],
    'html': ['HTML', '前端', '网页'],
    'tailwind': ['Tailwind', 'CSS', '前端'],
    // 后端
    'node': ['Node.js', '后端', 'JavaScript'],
    'python': ['Python', '后端', '编程'],
    'java': ['Java', '后端', '编程'],
    'go': ['Go', '后端', '编程'],
    'rust': ['Rust', '编程', '性能'],
    'api': ['API', '后端', '接口'],
    'rest': ['REST', 'API', '后端'],
    'graphql': ['GraphQL', 'API', '后端'],
    // 数据库
    'mysql': ['MySQL', '数据库', 'SQL'],
    'postgresql': ['PostgreSQL', '数据库', 'SQL'],
    'mongodb': ['MongoDB', '数据库', 'NoSQL'],
    'redis': ['Redis', '数据库', '缓存'],
    'sql': ['SQL', '数据库'],
    // 工具
    'git': ['Git', '版本控制', '协作'],
    'docker': ['Docker', '容器', 'DevOps'],
    'kubernetes': ['Kubernetes', '容器', 'DevOps'],
    'linux': ['Linux', '运维', '服务器'],
    // 其他
    '算法': ['算法', '编程', '数据结构'],
    '面试': ['面试', '求职', '经验'],
    '架构': ['架构', '设计', '系统'],
    '性能': ['性能', '优化', '经验'],
    '测试': ['测试', '质量', 'TDD'],
    '安全': ['安全', '加密', '防护']
  };

  // 分析内容并提取标签
  const analyzeContent = async () => {
    if (!content || content.trim().length < 10) {
      toast.warning('内容太少，无法提取标签');
      return;
    }

    setLoading(true);
    setShowSuggestions(true);

    try {
      // 尝试调用 API
      const res = await axios.post('/api/tags/suggest', { content });
      if (res.data.tags) {
        setSuggestedTags(res.data.tags.filter(t => !existingTags.includes(t)));
      }
    } catch (err) {
      // 本地分析
      const extractedTags = extractTagsLocally(content);
      setSuggestedTags(extractedTags.filter(t => !existingTags.includes(t)));
    } finally {
      setLoading(false);
    }
  };

  // 本地标签提取逻辑
  const extractTagsLocally = (text) => {
    const lowerText = text.toLowerCase();
    const foundTags = new Set();

    // 遍历关键词库
    Object.keys(techKeywords).forEach(keyword => {
      if (lowerText.includes(keyword)) {
        techKeywords[keyword].forEach(tag => foundTags.add(tag));
      }
    });

    // 提取 # 开头的标签
    const hashTags = text.match(/#(\S+)/g);
    if (hashTags) {
      hashTags.forEach(t => foundTags.add(t.replace('#', '')));
    }

    // 提取代码块中的语言
    const codeBlocks = text.match(/```(\w+)/g);
    if (codeBlocks) {
      codeBlocks.forEach(block => {
        const lang = block.replace('```', '');
        if (lang) foundTags.add(lang);
      });
    }

    return Array.from(foundTags).slice(0, 10);
  };

  // 添加单个标签
  const handleAddTag = (tag) => {
    if (onTagsAdd) {
      onTagsAdd([...existingTags, tag]);
    }
    setSuggestedTags(suggestedTags.filter(t => t !== tag));
  };

  // 添加所有标签
  const handleAddAll = () => {
    if (onTagsAdd) {
      onTagsAdd([...new Set([...existingTags, ...suggestedTags])]);
    }
    setSuggestedTags([]);
  };

  return (
    <div className="relative">
      {/* 提取按钮 */}
      <button
        type="button"
        onClick={analyzeContent}
        disabled={loading || !content || content.trim().length < 10}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            分析中...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            智能提取标签
          </>
        )}
      </button>

      {/* 建议标签弹窗 */}
      {showSuggestions && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-10">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              推荐标签
            </div>
            <button
              onClick={() => setShowSuggestions(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : suggestedTags.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              <Tag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              未找到相关标签
              <p className="text-xs mt-1 text-gray-400">请尝试添加更多内容</p>
            </div>
          ) : (
            <>
              <div className="p-3 flex flex-wrap gap-2">
                {suggestedTags.map((tag, index) => (
                  <button
                    key={index}
                    onClick={() => handleAddTag(tag)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    {tag}
                  </button>
                ))}
              </div>
              <div className="px-3 pb-3">
                <button
                  onClick={handleAddAll}
                  className="w-full py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  添加全部 ({suggestedTags.length})
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartTagExtractor;