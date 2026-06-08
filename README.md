# Lupine

> **From Solo to Symphony —— 从独奏到交响**
>
> 多 Agent 协作开发流水线，让 AI Coding 从"一句话指令"升级为"团队协作"。

---

## 快速开始

### 1. 环境准备

| 依赖 | 用途 |
|------|------|
| Node.js 18+ | `lupine` CLI 运行环境 |
| opencode 或 Claude Code | AI 会话与 Agent 运行 |

### 2. 初始化 `.lupine/` 工作区

```bash
# 本地开发版（克隆仓库后）
npx /Users/koalamini/Code/Lupine/packages/lupine init

# 发布后（待 npm publish）
npx lupine init
```

CLI 会交互式询问：

```
🐺 Lupine 项目初始化
--------------------

? 请输入项目名称: (my-project)
? 请选择 AI 平台: (opencode / claude) [opencode]
? 请指定代码仓库路径（可多个，用空格分隔）:
  ../my-app ../my-lib
```

初始化完成后，在当前目录生成 `.lupine/` 工作区：

```
.lupine/
├── CLAUDE.md                       ← AI 索引入口
├── PRODUCT.md                      ← 产品定义
├── README.md                       ← 项目介绍
├── .lupineconfig.json              ← 配置（含版本号、仓库路径、平台等）
├── FEATURES.json                   ← 功能清单（全景 + 状态 + 演进历史）
├── rules/                          ← 规范文件（coding/evals/git/release）
├── specs/                          ← 需求规格（WHAT + WHY）
├── plans/                          ← 执行计划（HOW）
├── reviews/                        ← 审查报告
└── <tool-agnostic>/                ← Agent 定义（根据平台生成，如 .opencode/）
    ├── agents/                     ← 四个子 Agent 的 prompt
    │   ├── lupine.md               ← 调度器
    │   ├── lupine-planner.md       ← 规划器
    │   ├── lupine-executor.md      ← 执行器
    │   └── lupine-evaluator.md     ← 评估器
    └── skills/                     ← Skill 工具集
        ├── requirements-management/← 需求管理
        ├── lupine-diagram/         ← 架构图生成
        ├── lupine-git-workflow/    ← Git 工作流
        └── ...                     ← 可扩展
```

### 3. 启动 AI 流水线

```bash
cd .lupine
opencode
```

AI 会自动读取 `CLAUDE.md`，以 **Lupine（调度器）** 角色开始工作。

### 4. 后续命令

```bash
npx lupine update          # 更新模板（智能保护用户修改）
npx lupine update --force  # 强制覆盖
npx lupine --help          # 查看帮助
```

---

## 文件结构

### Lupine 框架（本仓库）

```
Lupine/
├── .lupine/                        # 【工作区】AI 开发中枢
│   ├── CLAUDE.md                   # AI 索引入口
│   ├── PRODUCT.md                  # 产品定义
│   ├── .lupineconfig.json          # 仓库映射配置
│   ├── FEATURES.json               # 功能清单
│   ├── rules/                      # 研发规范
│   │   ├── coding.md / evals.md / git.md
│   ├── specs/                      # 需求规格
│   ├── plans/                      # 执行计划
│   ├── reviews/                    # 审查报告
│   └── .opencode/                  # AI 平台配置
│       ├── agents/                 # Agent prompt 模板
│       └── skills/                 # Skill 工具集
├── packages/
│   └── lupine/                     ← npm CLI 包源码
│       ├── bin/lupine.js           # CLI 入口
│       ├── src/                    # 命令实现
│       │   ├── main.js / init.js / update.js
│       │   ├── generate.js / config.js / checksum.js
│       │   ├── agents.js / skills.js / mcp.js
│       └── templates/              # 模板文件集
│           ├── agents/             # Agent 定义
│           ├── skills/             # 内置 skill
│           ├── rules/              # 规范
│           └── ...
```

---

## 如何工作

Lupine 工作流的核心架构在 `PRODUCT.md` 中有完整定义。简单来说：

```
你 → Lupine（调度器/产品经理）
      ├── 探索器  — 调研代码库/Web
      ├── 规划器  — 写执行计划
      ├── 执行器  — 写代码/测试
      └── 评估器  — 门禁审查（plan + code）
```

五角色（调度器+四个子Agent）各司其职，上下文隔离。从需求到代码合并经过两个门禁节点，每个 Agent 产出可追溯。

### 产出物模型

| 产出物 | 定位 | 所有者 |
|--------|------|--------|
| `PRODUCT.md` | 产品总纲 | 调度器 |
| `proposal/` | 架构方案/技术选型 | 调度器 |
| `specs/` | 需求规格（WHAT + WHY） | 调度器 |
| `plans/` | 执行计划（HOW） | 规划器 |
| `reviews/` | 审查报告 | 评估器 |
| `FEATURES.json` | 功能清单（全景 + 状态） | 调度器 |

### Skill 系统

Agent 可通过 Skill 扩展能力。内置 skill 包括：

- **requirements-management** — 维护 FEATURES.json、提案写作范式
- **lupine-diagram** — 生成架构图/流程图
- **lupine-git-workflow** — Git 分支与提交规范
- **brainstorming** — 创意发散与需求探讨
- **impeccable** — UI 审查与设计优化

---

## 已知局限

- 评估器推理能力依赖底层模型
- 多 session 并行时需要人工协调文件冲突
- 大 PR 审查可能有遗漏（模型上下文限制）
- Agent 规则依赖 AI 自主遵守，无强制机制

---

## 贡献

欢迎通过 Issue 和 PR 参与改进。

---

## License

MIT
