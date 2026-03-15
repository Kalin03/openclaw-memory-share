import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Loader2, 
  Wand2, 
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const AIWritingAssistant = ({ content, onApply, onClose }) => {
  const toast = useToast();
  const [selectedAction, setSelectedAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [showOriginal, setShowOriginal] = useState(true);

  const actions = [
    {
      id: 'improve',
      icon: '✨',
      label: '润色优化',
      description: '改进文字表达，使内容更流畅'
    },
    {
      id: 'expand',
      icon: '📝',
      label: '扩写内容',
      description: '丰富内容细节，增加深度'
    },
    {
      id: 'summarize',
      icon: '📋',
      label: '精简摘要',
      description: '提炼核心要点，简洁表达'
    },
    {
      id: 'fix',
      icon: '🔧',
      label: '纠错改写',
      description: '修正语法错误，规范表达'
    },
    {
      id: 'title',
      icon: '💡',
      label: '生成标题',
      description: '根据内容生成吸引人的标题'
    },
    {
      id: 'outline',
      icon: '📑',
      label: '生成大纲',
      description: '为内容生成结构化大纲'
    }
  ];

  // 模拟AI处理（实际项目中可接入真实AI API）
  const processContent = async (action) => {
    if (!content || content.trim().length < 10) {
      toast.warning('内容太少，请先输入更多内容');
      return;
    }

    setSelectedAction(action);
    setLoading(true);
    setResult('');

    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 根据不同action生成不同结果（这里用模拟数据）
    let processedResult = '';
    
    switch (action.id) {
      case 'improve':
        processedResult = improveContent(content);
        break;
      case 'expand':
        processedResult = expandContent(content);
        break;
      case 'summarize':
        processedResult = summarizeContent(content);
        break;
      case 'fix':
        processedResult = fixContent(content);
        break;
      case 'title':
        processedResult = generateTitles(content);
        break;
      case 'outline':
        processedResult = generateOutline(content);
        break;
      default:
        processedResult = content;
    }

    setResult(processedResult);
    setLoading(false);
  };

  // 润色优化
  const improveContent = (text) => {
    const improvements = [
      '使其表达更加流畅自然：',
      '',
      text
        .replace(/很/g, '十分')
        .replace(/非常/g, '极其')
        .replace(/但是/g, '然而')
        .replace(/因为/g, '由于')
        .replace(/所以/g, '因此')
        .replace(/。/g, '。\n'),
      '',
      '💡 优化要点：',
      '- 调整了部分词语，使表达更书面化',
      '- 改进了句式结构，增强可读性',
      '- 优化了段落节奏，使内容更流畅'
    ];
    return improvements.join('\n');
  };

  // 扩写内容
  const expandContent = (text) => {
    return `${text}

📌 扩展内容：

在深入探讨这个话题时，我们需要考虑几个关键方面：

首先，从实践角度来看，这个观点具有重要的现实意义。通过具体案例分析，我们可以更清晰地理解其内涵。

其次，从理论层面来说，这涉及到多个学科领域的交叉研究。不同视角的融合为我们提供了更全面的认识。

最后，从发展趋势来看，这个领域正在经历快速变革。新技术的应用为传统方法带来了新的可能性。

💡 建议：可以结合具体案例和个人经验，使内容更加丰富生动。`;
  };

  // 精简摘要
  const summarizeContent = (text) => {
    const sentences = text.split(/[。！？\n]/).filter(s => s.trim());
    const keyPoints = sentences.slice(0, 3).join('。');
    return `📋 内容摘要：

${keyPoints}。

---

💡 核心要点：
• 要点一：${sentences[0]?.substring(0, 30) || '主要内容'}...
• 要点二：${sentences[1]?.substring(0, 30) || '支撑论点'}...
• 要点三：${sentences[2]?.substring(0, 30) || '结论建议'}...

字数：${text.length} → ${keyPoints.length}（减少 ${Math.round((1 - keyPoints.length / text.length) * 100)}%）`;
  };

  // 纠错改写
  const fixContent = (text) => {
    return `✅ 修正后的内容：

${text
  .replace(/的地得/g, (match, offset, string) => {
    const prev = string[offset - 1] || '';
    const next = string[offset + 1] || '';
    if (/[形容词副词]/.test(prev) && /[名词]/.test(next)) return '的';
    if (/[动词]/.test(prev)) return '得';
    return '地';
  })
  .replace(/不知道/g, '不晓得')
  .replace(/这样的话/g, '这样一来')}

---

💡 修正说明：
• 检查并修正了"的地得"用法
• 调整了口语化表达
• 规范了标点符号使用`;
  };

  // 生成标题
  const generateTitles = (text) => {
    const keywords = text.substring(0, 50);
    return `💡 建议标题：

1. 【精选】${keywords.substring(0, 20)}...的深度解析

2. 【实用】关于${keywords.substring(0, 15)}，你需要知道的一切

3. 【疑问】为什么${keywords.substring(0, 15)}如此重要？

4. 【指南】${keywords.substring(0, 20)}：完整指南

5. 【分享】我对${keywords.substring(0, 15)}的思考与总结

---

💡 标题建议：
• 选择1适合深度分析类内容
• 选择3适合引发读者兴趣
• 选择5适合个人感悟分享`;
  };

  // 生成大纲
  const generateOutline = (text) => {
    const sentences = text.split(/[。！？\n]/).filter(s => s.trim());
    return `📑 内容大纲：

一、引言
   1.1 背景介绍
   1.2 问题提出

二、主体内容
   2.1 核心观点：${sentences[0]?.substring(0, 30) || '待展开'}...
   2.2 论据支撑
       • 案例分析
       • 数据引用
   2.3 深入讨论：${sentences[1]?.substring(0, 30) || '待展开'}...

三、总结与展望
   3.1 主要结论
   3.2 未来展望
   3.3 行动建议

---

💡 使用建议：
• 根据大纲补充各部分内容
• 保持逻辑递进关系
• 适当添加案例和数据`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      toast.success('已复制到剪贴板');
    } catch (error) {
      toast.error('复制失败');
    }
  };

  const handleApply = () => {
    if (result && onApply) {
      // 提取纯内容（去掉说明部分）
      const pureContent = result.split('---')[0].split('💡')[0].trim();
      onApply(pureContent);
      toast.success('已应用到编辑器');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="text-purple-500" size={24} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>AI 写作助手</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="p-4 grid grid-cols-3 gap-2 shrink-0">
          {actions.map(action => (
            <button
              key={action.id}
              onClick={() => processContent(action)}
              disabled={loading}
              className={`p-3 rounded-xl border transition-all text-left ${
                selectedAction?.id === action.id 
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                  : 'hover:border-gray-300'
              }`}
              style={{ 
                borderColor: selectedAction?.id === action.id ? undefined : 'var(--border-color)',
                opacity: loading ? 0.5 : 1
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{action.icon}</span>
                <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                  {action.label}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {action.description}
              </p>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Original Content */}
          {showOriginal && content && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  📄 原始内容
                </span>
                <button
                  onClick={() => setShowOriginal(false)}
                  className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <ChevronUp size={16} />
                </button>
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                {content.substring(0, 300)}{content.length > 300 ? '...' : ''}
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-12">
              <Loader2 size={32} className="animate-spin mx-auto mb-3 text-purple-500" />
              <p style={{ color: 'var(--text-secondary)' }}>
                <Wand2 className="inline mr-1" size={16} />
                AI 正在{selectedAction?.label}...
              </p>
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  ✨ 处理结果
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="复制"
                  >
                    <Copy size={16} style={{ color: 'var(--text-secondary)' }} />
                  </button>
                  <button
                    onClick={() => processContent(selectedAction)}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="重新生成"
                  >
                    <RefreshCw size={16} style={{ color: 'var(--text-secondary)' }} />
                  </button>
                </div>
              </div>
              <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                {result}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {result && (
          <div className="p-4 border-t shrink-0" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 rounded-lg border font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                取消
              </button>
              <button
                onClick={handleApply}
                className="flex-1 py-2 px-4 rounded-lg bg-purple-500 text-white font-medium transition-colors hover:bg-purple-600 flex items-center justify-center gap-2"
              >
                <Check size={18} />
                应用结果
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIWritingAssistant;