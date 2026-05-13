# {项目名称}

> {一句话描述项目}

## 项目结构

```
├── CLAUDE.md    # AI 索引入口
├── README.md    # 本文件
├── VISION.md    # 产品定位与愿景
├── rules/       # 规范文件（Git、编码、Agent、评估）
├── specs/       # 需求规格说明书
├── plans/       # 技术设计方案
├── reviews/     # 审查报告
└── tasks/       # 任务跟踪
```

## 开发流程

本项目使用 [Lupine](https://github.com/anthropics/lupine) 多 Agent 协作开发流水线。

| 阶段 | 指令 | 产出 |
|------|------|------|
| 需求分析 | `/lupine-analyzer` | VISION.md + specs/ |
| 技术设计 | `/lupine-planner` | plans/ |
| 代码实现 | `/lupine-executor` | 代码 + tasks/ |
| 质量审查 | `/lupine-evaluator` | reviews/ |
