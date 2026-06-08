---
name: lupine-diagram
description: 生成 Gliffy 风格的 SVG 架构图/流程图，用于需求探讨、方案对比、审查报告中的可视辅助
---

## 用法

任何子Agent需要制图辅助时（需求讨论、方案对比、架构展示、审查报告），加载此SKILL并遵循以下规范。

## SVG 规范

### 通用规则
- 纯 SVG，不含 script 或外部资源
- 内联样式，不引用外部 CSS
- `font-family` 用系统等宽字体：`'SF Mono', 'Menlo', 'Consolas', monospace`
- 配色克制：黑白灰为主，用单色强调（推荐 `#4A90D9` 蓝色系）
- 文字中的 `&` 必须写作 `&amp;`

### 节点样式
| 元素 | 填色 | 描边 | 圆角 |
|------|------|------|------|
| 用户 | `#E8F5E9` | `#4CAF50` | 20px (胶囊) |
| 主Agent | `#FFF3E0` | `#FF9800` | 12px |
| 子Agent | `#E3F2FD` | `#1976D2` | 10px |
| 过程/动作 | `#FFF` | `#DDD` | 8px |
| 说明框 | `#FFF8E1` | `#FFC107` | 6px |

### 连线样式
- 主流程线：`stroke="#666" stroke-width="2"` 实线 + 箭头
- task调用线：`stroke="#4A90D9" stroke-width="1.5"` 虚线 `stroke-dasharray="6,4"` + 箭头
- 说明线：浅色虚线

### 布局约定
- SVG `viewBox` 宽高比推荐 4:3 或 3:2
- 主体居中，上方标题区，下方说明区
- 元素间隔不小于 20px

## 保存路径
- `.lupine/sketches/{主题}/`
- 文件名：`{主题}-{序号}.svg`（如 `需求分析-01.svg`）
- 草图不入版本控制（`.lupine/` 已 gitignore）

## 产出要求
- 每个 SVG 文件不超过 80 行
- 复杂度高时拆分多个 SVG，不塞进一个文件
- 生成后告知文件路径
