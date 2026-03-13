import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Pause, Play, Settings } from 'lucide-react';

const TextToSpeech = ({ text, title }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [rate, setRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // 加载可用的语音
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // 默认选择中文语音
      const chineseVoice = availableVoices.find(v => 
        v.lang.includes('zh') || v.lang.includes('CN')
      );
      if (chineseVoice) {
        setSelectedVoice(chineseVoice);
      } else if (availableVoices.length > 0) {
        setSelectedVoice(availableVoices[0]);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const getCleanText = useCallback(() => {
    // 移除 Markdown 标记，保留纯文本
    let cleanText = text || '';
    
    // 移除代码块
    cleanText = cleanText.replace(/```[\s\S]*?```/g, '');
    cleanText = cleanText.replace(/`[^`]+`/g, '');
    
    // 移除链接，保留文字
    cleanText = cleanText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // 移除图片
    cleanText = cleanText.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
    
    // 移除标题标记
    cleanText = cleanText.replace(/^#{1,6}\s+/gm, '');
    
    // 移除加粗/斜体
    cleanText = cleanText.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleanText = cleanText.replace(/\*([^*]+)\*/g, '$1');
    cleanText = cleanText.replace(/__([^_]+)__/g, '$1');
    cleanText = cleanText.replace(/_([^_]+)_/g, '$1');
    
    // 移除引用标记
    cleanText = cleanText.replace(/^>\s+/gm, '');
    
    // 移除列表标记
    cleanText = cleanText.replace(/^[-*+]\s+/gm, '');
    cleanText = cleanText.replace(/^\d+\.\s+/gm, '');
    
    // 移除水平线
    cleanText = cleanText.replace(/^---+$/gm, '');
    
    return cleanText.trim();
  }, [text]);

  const speak = useCallback(() => {
    if (!text) return;

    const cleanText = getCleanText();
    if (!cleanText) return;

    // 取消当前播放
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = rate;
    utterance.pitch = 1;
    
    // 添加标题
    const fullText = title ? `${title}。${cleanText}` : cleanText;
    utterance.text = fullText;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [text, title, selectedVoice, rate, getCleanText]);

  const pause = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  // 检查浏览器是否支持语音合成
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2">
      {!isSpeaking ? (
        <button
          onClick={speak}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          title="朗读记忆"
        >
          <Volume2 size={16} />
          <span className="hidden sm:inline">朗读</span>
        </button>
      ) : (
        <>
          {isPaused ? (
            <button
              onClick={resume}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90"
              title="继续"
            >
              <Play size={16} />
              <span className="hidden sm:inline">继续</span>
            </button>
          ) : (
            <button
              onClick={pause}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90"
              title="暂停"
            >
              <Pause size={16} />
              <span className="hidden sm:inline">暂停</span>
            </button>
          )}
          <button
            onClick={stop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            title="停止"
          >
            <VolumeX size={16} />
            <span className="hidden sm:inline">停止</span>
          </button>
        </>
      )}
      
      <button
        onClick={toggleSettings}
        className={`p-1.5 rounded-lg transition-colors hover:opacity-80 ${showSettings ? 'bg-primary/20' : ''}`}
        style={{ color: 'var(--text-secondary)' }}
        title="设置"
      >
        <Settings size={16} />
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <div 
          className="absolute top-full right-0 mt-2 p-4 rounded-lg shadow-lg border z-50 min-w-[200px]"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
                语音选择
              </label>
              <select
                value={selectedVoice?.name || ''}
                onChange={(e) => {
                  const voice = voices.find(v => v.name === e.target.value);
                  setSelectedVoice(voice || null);
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  borderColor: 'var(--border-color)', 
                  color: 'var(--text-primary)' 
                }}
              >
                {voices.map(voice => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
                语速: {rate.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                <span>慢</span>
                <span>快</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextToSpeech;