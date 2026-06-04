# {project_name}

> 由 Lupine 多 Agent 流水线驱动开发

## 项目结构

```
.lupine/                    ← AI 开发中枢
├── CLAUDE.md               # AI 索引入口
├── README.md               # 本文件
├── PRODUCT.md              # 产品定义
├── rules/                  # 规范文件
├── specs/                  # 需求规格
├── plans/                  # 执行计划
└── reviews/                # 审查报告
```

## 开发流程

本项目使用 [Lupine](https://github.com/koalamini/lupine) 多 Agent 协作开发流水线。

| 阶段 | 操作 | 产出 |
|------|------|------|
| 需求分析 | 与 Lupine 对话探讨需求 | PRODUCT.md + specs/ |
| 技术设计 | Lupine 派规划器出方案 | plans/ |
| 并行实现 | Lupine 派执行器写代码 | 代码 |
| 质量审查 | Lupine 派评估器审查 | reviews/ |
