import React from 'react';
import { 
  BookOpen, 
  Calendar, 
  Users, 
  Lightbulb, 
  Briefcase, 
  Heart,
  Target,
  FileText
} from 'lucide-react';

// 预设模板定义
export const memoryTemplates = [
  {
    id: 'blank',
    name: '空白模板',
    icon: FileText,
    description: '从零开始记录',
    template: {
      title: '',
      content: '',
      tags: ''
    }
  },
  {
    id: 'diary',
    name: '日记',
    icon: Calendar,
    description: '记录每日生活',
    template: {
      title: '日记 - ',
      content: `## 今日心情
[开心/平静/疲惫/焦虑...]

## 今日事件
- 
- 
- 

## 今日感悟
[记录今天的收获或思考]

## 明日计划
- [ ] 
- [ ] `,
      tags: '日记'
    }
  },
  {
    id: 'reading',
    name: '读书笔记',
    icon: BookOpen,
    description: '记录阅读心得',
    template: {
      title: '读书笔记 - 《书名》',
      content: `## 书籍信息
- 书名：
- 作者：
- 阅读日期：

## 核心观点
1. 
2. 
3. 

## 精彩摘录
> 

## 我的思考
[这本书给我的启发...]

## 行动计划
- [ ] `,
      tags: '读书笔记'
    }
  },
  {
    id: 'meeting',
    name: '会议记录',
    icon: Users,
    description: '记录会议要点',
    template: {
      title: '会议记录 - ',
      content: `## 会议信息
- 时间：
- 地点：
- 参会人员：

## 会议议题
1. 
2. 

## 讨论要点
### 议题一
- 

### 议题二
- 

## 决议事项
- [ ] 
- [ ] 

## 后续跟进
| 事项 | 负责人 | 截止日期 |
|------|--------|----------|
|  |  |  |`,
      tags: '会议记录'
    }
  },
  {
    id: 'idea',
    name: '灵感记录',
    icon: Lightbulb,
    description: '捕捉灵感火花',
    template: {
      title: '灵感 - ',
      content: `## 灵感来源
[这个灵感是怎么产生的？]

## 核心想法
[用一句话描述]

## 详细内容
[展开描述你的想法]

## 可行性分析
- 优势：
- 挑战：
- 所需资源：

## 下一步行动
- [ ] `,
      tags: '灵感'
    }
  },
  {
    id: 'project',
    name: '项目总结',
    icon: Briefcase,
    description: '记录项目进展',
    template: {
      title: '项目总结 - ',
      content: `## 项目概况
- 项目名称：
- 时间周期：
- 项目目标：

## 完成情况
- [x] 已完成
- [ ] 进行中
- [ ] 待开始

## 关键成果
1. 
2. 

## 遇到的问题
| 问题 | 解决方案 | 状态 |
|------|----------|------|
|  |  |  |

## 经验教训
- 

## 后续计划
- [ ] `,
      tags: '项目总结'
    }
  },
  {
    id: 'goal',
    name: '目标追踪',
    icon: Target,
    description: '追踪目标进度',
    template: {
      title: '目标追踪 - ',
      content: `## 目标设定
**主要目标**：

**截止日期**：

**成功标准**：
- [ ] 
- [ ] 

## 阶段性目标
| 阶段 | 目标 | 截止日期 | 状态 |
|------|------|----------|------|
| 1 |  |  | ⏳ |
| 2 |  |  | ⏳ |
| 3 |  |  | ⏳ |

## 本周进展
- 

## 遇到的障碍
- 

## 调整计划
- `,
      tags: '目标追踪'
    }
  },
  {
    id: 'gratitude',
    name: '感恩日记',
    icon: Heart,
    description: '记录感恩之事',
    template: {
      title: '感恩日记 - ',
      content: `## 今日感恩
1. 🙏 
2. 🙏 
3. 🙏 

## 美好瞬间
[今天发生的美好事情...]

## 自我肯定
[今天做得好的地方...]

## 明日期待
[期待明天会发生什么...]`,
      tags: '感恩日记'
    }
  }
];

// 模板选择器组件
const MemoryTemplates = ({ selectedTemplate, onSelect }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {memoryTemplates.map(template => {
        const Icon = template.icon;
        const isSelected = selectedTemplate === template.id;
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            className={`p-3 rounded-xl border-2 transition-all text-left ${
              isSelected 
                ? 'border-primary bg-primary/10' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            style={{ backgroundColor: isSelected ? 'rgba(232, 87, 43, 0.1)' : 'var(--bg-secondary)' }}
          >
            <Icon 
              className={`w-5 h-5 mb-1 ${isSelected ? 'text-primary' : ''}`} 
              style={{ color: isSelected ? '#e8572b' : 'var(--text-secondary)' }} 
            />
            <div 
              className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}
              style={{ color: isSelected ? '#e8572b' : 'var(--text-primary)' }}
            >
              {template.name}
            </div>
            <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
              {template.description}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default MemoryTemplates;