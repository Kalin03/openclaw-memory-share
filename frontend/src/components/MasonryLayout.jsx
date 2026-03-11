import React from 'react';

/**
 * 瀑布流布局组件
 * 使用CSS columns实现真正的瀑布流效果
 */
const MasonryLayout = ({ children, columns = 2, gap = 24 }) => {
  const columnStyle = {
    columnCount: columns,
    columnGap: `${gap}px`,
    // 防止卡片被分割
    breakInside: 'avoid',
    // 或者使用浏览器前缀
    WebkitColumnBreakInside: 'avoid',
  };

  return (
    <div style={columnStyle}>
      {React.Children.map(children, (child) => (
        <div style={{ breakInside: 'avoid', marginBottom: `${gap}px` }}>
          {child}
        </div>
      ))}
    </div>
  );
};

export default MasonryLayout;