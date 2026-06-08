# Lupine

> 由 Lupine 多 Agent 流水线驱动开发
>
> {project_slogan}

## 项目结构

```
.lupine/                    ← AI 开发中枢
├── CLAUDE.md               # AI 索引入口
├── README.md               # 本文件（项目介绍）
├── PRODUCT.md              # 产品定义（总纲）
├── .lupineconfig.json      # 工作区配置（仓库映射等）
├── _manifest.json          # 模板清单（自动生成）
├── .lupine-version         # Lupine 版本号
├── rules/                  # 规范文件
│   └── coding.md           # 技术栈、编码约定、命名规范
├── specs/                  # 需求规格（给人读，WHAT + WHY）
├── plans/                  # 执行计划（给 AI 执行，只读）
├── reviews/                # 审查报告
└── .opencode/              # AI 工具配置（如 agents、skills）
```

## 开发流程

本项目使用 [Lupine](https://github.com/koalamini/lupine) 多 Agent 协作开发流水线。

| 阶段 | 操作 | 产出 |
|------|------|------|
| 需求分析 | 与 Lupine 对话探讨需求 | `PRODUCT.md` + `specs/` |
| 技术设计 | Lupine 派规划器出方案 | `plans/` |
| 并行实现 | Lupine 派执行器写代码 | 代码 |
| 质量审查 | Lupine 派评估器审查 | `reviews/` |

## 快速上手

### 1. 进入驾驶室

打开 `.lupine/` 目录 —— 这是你的 AI 开发中枢工作区。

### 2. 点火启动

在 IDE 中打开 AI Coding 工具（如 OpenCode、Claude Code 等）。

### 3. 开始驾驶

直接与 Lupine 对话描述你的需求，就像和副驾驶交流一样自然。

**建议首航路线：**

```
「帮我完善 PRODUCT.md，描述这个项目要做什么」
         ↓
「根据我们的技术栈，更新一下 coding.md 的规范」
         ↓
「开始开发第一个功能：xxx」
```

Lupine 会自动接管后续 —— 需求拆解、技术设计、代码实现、质量审查，全程自动驾驶。
