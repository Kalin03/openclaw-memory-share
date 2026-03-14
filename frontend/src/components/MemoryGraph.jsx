import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Move, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

// 力导向图简单实现
const GraphVisualization = ({ nodes, links, onNodeClick }) => {
  const canvasRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [simulation, setSimulation] = useState(null);
  const animationRef = useRef(null);

  // 初始化节点位置
  useEffect(() => {
    if (!nodes || nodes.length === 0) return;

    const centerX = 400;
    const centerY = 300;
    
    const initializedNodes = nodes.map((node, i) => ({
      ...node,
      x: node.x || centerX + (Math.random() - 0.5) * 200,
      y: node.y || centerY + (Math.random() - 0.5) * 200,
      vx: 0,
      vy: 0
    }));

    // 简单的力模拟
    let currentNodes = initializedNodes;
    let iteration = 0;
    const maxIterations = 100;

    const simulate = () => {
      if (iteration >= maxIterations) return;

      // 斥力
      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < currentNodes.length; j++) {
          const dx = currentNodes[j].x - currentNodes[i].x;
          const dy = currentNodes[j].y - currentNodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 500 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          currentNodes[i].vx -= fx;
          currentNodes[i].vy -= fy;
          currentNodes[j].vx += fx;
          currentNodes[j].vy += fy;
        }
      }

      // 引力（链接）
      links.forEach(link => {
        const source = currentNodes.find(n => n.id === link.source);
        const target = currentNodes.find(n => n.id === link.target);
        if (!source || !target) return;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = dist * 0.01;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      });

      // 向中心的引力
      currentNodes.forEach(node => {
        node.vx += (centerX - node.x) * 0.001;
        node.vy += (centerY - node.y) * 0.001;
      });

      // 更新位置
      currentNodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= 0.9;
        node.vy *= 0.9;
        
        // 边界限制
        node.x = Math.max(50, Math.min(750, node.x));
        node.y = Math.max(50, Math.min(550, node.y));
      });

      iteration++;
      setSimulation([...currentNodes]);

      if (iteration < maxIterations) {
        animationRef.current = requestAnimationFrame(simulate);
      }
    };

    simulate();
    setSimulation(initializedNodes);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes, links]);

  // 绘制画布
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !simulation) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 应用变换
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // 绘制链接
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 1;
    links.forEach(link => {
      const source = simulation.find(n => n.id === link.source);
      const target = simulation.find(n => n.id === link.target);
      if (!source || !target) return;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    });

    // 绘制节点
    simulation.forEach(node => {
      // 节点圆圈
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size || 8, 0, Math.PI * 2);
      ctx.fillStyle = node.color || '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 节点标签
      ctx.fillStyle = '#1f2937';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      const label = node.title?.substring(0, 10) + (node.title?.length > 10 ? '...' : '');
      ctx.fillText(label || '', node.x, node.y + (node.size || 8) + 14);
    });

    ctx.restore();
  }, [simulation, links, transform]);

  // 鼠标事件处理
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3, prev.scale * delta))
    }));
  };

  const handleClick = (e) => {
    if (isDragging) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - transform.x) / transform.scale;
    const y = (e.clientY - rect.top - transform.y) / transform.scale;

    // 查找点击的节点
    const clickedNode = simulation?.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) < (node.size || 8);
    });

    if (clickedNode && onNodeClick) {
      onNodeClick(clickedNode);
    }
  };

  const handleZoomIn = () => {
    setTransform(prev => ({ ...prev, scale: Math.min(3, prev.scale * 1.2) }));
  };

  const handleZoomOut = () => {
    setTransform(prev => ({ ...prev, scale: Math.max(0.5, prev.scale * 0.8) }));
  };

  const handleReset = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full cursor-move"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
      />
      
      {/* 控制按钮 */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 rounded-lg shadow-lg transition-colors"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
          title="放大"
        >
          <ZoomIn size={18} style={{ color: 'var(--text-primary)' }} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-lg shadow-lg transition-colors"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
          title="缩小"
        >
          <ZoomOut size={18} style={{ color: 'var(--text-primary)' }} />
        </button>
        <button
          onClick={handleReset}
          className="p-2 rounded-lg shadow-lg transition-colors"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
          title="重置视图"
        >
          <RotateCcw size={18} style={{ color: 'var(--text-primary)' }} />
        </button>
      </div>
    </div>
  );
};

const MemoryGraph = ({ isOpen, onClose }) => {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, references, tags
  const [stats, setStats] = useState({ nodes: 0, links: 0 });
  const navigate = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchGraphData();
    }
  }, [isOpen, filter]);

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      
      // 获取所有记忆
      const memoriesRes = await axios.get(`${API_URL}/memories?limit=100`);
      const memories = memoriesRes.data.memories || [];

      // 获取引用关系
      const referencesRes = await axios.get(`${API_URL}/references`);
      const references = referencesRes.data.references || [];

      // 构建节点
      const graphNodes = memories.map(m => ({
        id: m.id,
        title: m.title,
        color: getNodeColor(m),
        size: getNodeSize(m)
      }));

      // 构建链接
      const graphLinks = [];

      if (filter === 'all' || filter === 'references') {
        // 引用关系
        references.forEach(ref => {
          graphLinks.push({
            source: ref.source_memory_id,
            target: ref.target_memory_id,
            type: 'reference'
          });
        });
      }

      if (filter === 'all' || filter === 'tags') {
        // 标签关联（共享相同标签的记忆）
        const tagMap = {};
        memories.forEach(m => {
          if (!m.tags) return;
          const tags = m.tags.split(',').map(t => t.trim());
          tags.forEach(tag => {
            if (!tagMap[tag]) tagMap[tag] = [];
            tagMap[tag].push(m.id);
          });
        });

        // 为共享标签的记忆创建链接
        Object.values(tagMap).forEach(memoryIds => {
          for (let i = 0; i < memoryIds.length; i++) {
            for (let j = i + 1; j < memoryIds.length; j++) {
              graphLinks.push({
                source: memoryIds[i],
                target: memoryIds[j],
                type: 'tag'
              });
            }
          }
        });
      }

      setNodes(graphNodes);
      setLinks(graphLinks);
      setStats({ nodes: graphNodes.length, links: graphLinks.length });
    } catch (err) {
      console.error('获取图谱数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const getNodeColor = (memory) => {
    // 根据记忆类型或属性设置颜色
    if (memory.is_pinned) return '#f59e0b'; // 置顶：橙色
    if (memory.likes_count > 10) return '#10b981'; // 热门：绿色
    if (memory.views_count > 100) return '#8b5cf6'; // 高浏览：紫色
    return '#3b82f6'; // 普通：蓝色
  };

  const getNodeSize = (memory) => {
    // 根据互动量设置大小
    const interactions = (memory.likes_count || 0) + (memory.comments_count || 0) + (memory.bookmarks_count || 0);
    return Math.max(6, Math.min(15, 6 + interactions * 0.5));
  };

  const handleNodeClick = useCallback((node) => {
    if (window.confirm(`打开记忆: "${node.title}"？`)) {
      window.location.href = `/memory/${node.id}`;
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl shadow-2xl flex flex-col"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              记忆关系图谱
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {stats.nodes} 个记忆 · {stats.links} 个关联
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* 过滤器 */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm"
              style={{ 
                backgroundColor: 'var(--bg-tertiary)', 
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
              }}
            >
              <option value="all">全部关联</option>
              <option value="references">仅引用关系</option>
              <option value="tags">仅标签关联</option>
            </select>

            <button
              onClick={fetchGraphData}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
              title="刷新"
            >
              <RefreshCw size={18} style={{ color: 'var(--text-secondary)' }} />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={20} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p style={{ color: 'var(--text-secondary)' }}>正在构建图谱...</p>
              </div>
            </div>
          ) : nodes.length === 0 ? (
            <div className="text-center py-12">
              <p style={{ color: 'var(--text-secondary)' }}>暂无记忆数据</p>
            </div>
          ) : (
            <>
              <GraphVisualization 
                nodes={nodes} 
                links={links} 
                onNodeClick={handleNodeClick}
              />
              
              {/* 图例 */}
              <div className="mt-4 flex flex-wrap gap-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>普通记忆</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>置顶记忆</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>热门记忆</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>高浏览</span>
                </div>
              </div>

              <p className="text-center text-sm mt-3" style={{ color: 'var(--text-tertiary)' }}>
                💡 点击节点查看详情 · 滚轮缩放 · 拖拽移动
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoryGraph;