import React from 'react';

const SkipToContent = () => {
  return (
    <a
      href="#main-content"
      className="skip-link"
      style={{
        position: 'absolute',
        top: '-100px',
        left: '0',
        background: '#3b82f6',
        color: 'white',
        padding: '8px 16px',
        zIndex: 9999,
        borderRadius: '0 0 4px 0',
        transition: 'top 0.2s',
      }}
      onFocus={(e) => {
        e.target.style.top = '0';
      }}
      onBlur={(e) => {
        e.target.style.top = '-100px';
      }}
    >
      跳转到主要内容
    </a>
  );
};

export default SkipToContent;