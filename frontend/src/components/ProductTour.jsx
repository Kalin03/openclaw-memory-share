import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  FileText,
  Search,
  Bookmark,
  Bell,
  Keyboard,
  Check
} from 'lucide-react';

const ProductTour = ({ onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const steps = [
    {
      title: '欢迎来到 Memory Share 🦞',
      description: '这是一个记忆分享平台，让你记录、分享、发现有价值的内容。让我们快速了解一下主要功能！',
      icon: Sparkles,
      highlight: null
    },
    {
      title: '创建记忆',
      description: '点击右上角的"创建"按钮，或使用快捷键 N，开始记录你的想法、笔记或经验。',
      icon: FileText,
      highlight: 'create-btn',
      tip: '支持 Markdown 格式，让你的内容更加丰富'
    },
    {
      title: '搜索与发现',
      description: '使用搜索框查找感兴趣的内容，支持关键词、标签、作者等多种搜索方式。',
      icon: Search,
      highlight: 'search-box',
      tip: '试试搜索"AI"或"开发"看看有什么发现'
    },
    {
      title: '收藏与整理',
      description: '看到喜欢的内容？点击收藏按钮保存到你的收藏夹，还可以创建收藏夹分类管理。',
      icon: Bookmark,
      highlight: null,
      tip: '收藏的内容可以在个人主页查看'
    },
    {
      title: '快捷键',
      description: '按下 ? 键查看所有快捷键，或者 Cmd/Ctrl + K 打开命令面板快速访问功能。',
      icon: Keyboard,
      highlight: null,
      tip: '熟练使用快捷键可以大大提高效率'
    },
    {
      title: '开始探索吧！',
      description: '你已经了解了主要功能。现在开始创建你的第一条记忆，或者浏览热门内容发现更多精彩！',
      icon: Check,
      highlight: null
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('product-tour-completed', 'true');
    setIsVisible(false);
    if (onComplete) onComplete();
  };

  const handleSkip = () => {
    handleComplete();
    if (onClose) onClose();
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute top-4 right-4 px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
      >
        跳过引导
      </button>

      <div 
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-in"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Progress */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div 
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4">
            <Icon size={32} className="text-primary" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-center mb-2" style={{ color: 'var(--text-primary)' }}>
            {currentStepData.title}
          </h2>

          {/* Description */}
          <p className="text-center mb-4" style={{ color: 'var(--text-secondary)' }}>
            {currentStepData.description}
          </p>

          {/* Tip */}
          {currentStepData.tip && (
            <div className="p-3 rounded-lg text-sm text-center" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              💡 {currentStepData.tip}
            </div>
          )}

          {/* Step indicators */}
          <div className="flex justify-center gap-1.5 my-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep ? 'w-6 bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {!isFirstStep && (
              <button
                onClick={handlePrev}
                className="flex-1 py-3 rounded-xl border font-medium flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                <ChevronLeft size={18} />
                上一步
              </button>
            )}
            
            <button
              onClick={handleNext}
              className={`${isFirstStep ? 'w-full' : 'flex-1'} py-3 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors`}
            >
              {isLastStep ? (
                <>
                  <Check size={18} />
                  开始使用
                </>
              ) : (
                <>
                  下一步
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 首次访问检查 Hook
export const useProductTour = () => {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const tourCompleted = localStorage.getItem('product-tour-completed');
    const hasVisited = localStorage.getItem('has-visited');
    
    if (!tourCompleted && !hasVisited) {
      // 延迟显示，让页面先加载完成
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 1500);
      
      localStorage.setItem('has-visited', 'true');
      
      return () => clearTimeout(timer);
    }
  }, []);

  const completeTour = () => {
    setShowTour(false);
    localStorage.setItem('product-tour-completed', 'true');
  };

  return { showTour, setShowTour, completeTour };
};

export default ProductTour;