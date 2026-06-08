# Lupine

> Lupine 是一个多 Agent 协作开发框架。核心是一个"产品经理"角色的主Agent（Lupine），它不自己干所有活——它带领四个专业子Agent（探索器、规划器、执行器、评估器）协同完成开发任务。

## AI 阅读顺序

1. **本项目总纲** → `PRODUCT.md`
2. **代码仓库映射** → `.lupine/.lupineconfig.json`（查看 `workspace` 和 `repositories` 字段）

## 项目目录结构

```
~/Code/Lupine/                         ← 项目根目录（Git 仓库）
├── .github/workflows/                 ← CI/CD 配置
├── .lupine/                           ← 【工作区】AI 开发中枢
│   ├── .lupineconfig.json             ← 仓库映射配置
│   ├── specs/                         ← 需求规格
│   ├── plans/                         ← 执行计划
│   ├── reviews/                       ← 审查报告
│   └── ...
├── packages/
│   └── lupine/                        ← 核心框架源码
└── ...
```

## 区域概念

- **工作区**：见 `.lupine/.lupineconfig.json` → `workspace`
- **源码区**：见 `.lupine/.lupineconfig.json` → `repositories`

> 设计细节见 `specs/上下文体系.md` 第 5.2 节

## 文件导航

| 文件/目录 | 用途 |
|-----------|------|
| `CLAUDE.md` | 本文件：AI 索引入口 |
| `README.md` | 项目介绍（面向人） |
| `PRODUCT.md` | 产品定义（总纲） |
| `rules/git.md` | Git 分支、Commit、PR 规范 |
| `rules/coding.md` | 技术栈、编码约定、命名规范 |
| `rules/evals.md` | 评估门禁标准 |
| `templates/agents/` | Agent prompt 模板（渲染为各 AI 工具的 Agent 配置文件） |
| `specs/` | 需求规格（给人读，WHAT + WHY） |
| `plans/` | 执行计划（给AI执行，只读） |
| `reviews/` | 审查报告 |
