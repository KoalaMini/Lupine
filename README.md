# Lupine

> **From Solo to Symphony —— 从独奏到交响**
>
> 多 Agent 协作开发流水线，让 AI Coding 从"一句话指令"升级为"团队协作"。

---

## Why This Exists · 为什么需要这个

当前 AI Coding 工具（Cursor、Claude Code、GitHub Copilot 等）的使用方式本质上是 **人给指令 → AI 写代码** 的直给模式。问题在于：

- **质量看运气**——取决于 prompt 质量，缺少需求澄清和审查环节
- **角色混在一起**——一个 session 里既当 BA 又当架构师又当开发
- **不可追溯**——需求假设、架构决策、代码实现没有文档锚点
- **单线程**——无法让多个 AI 并行工作

这套架构将 AI Coding 从**独奏（Solo）** 变为**交响（Symphony）**：多个有明确角色分工的 Agent 协同工作，每个阶段有产出、有审查、可追溯。

## The Four Roles · 四角色协作

```
用户需求 / idea
   │
   ▼
┌──────────────────────────────┐
│  Lupine（狼王）               │  ← 产品定位与愿景 → PRODUCT.md
│  （产品经理+调度器）           │  ← 功能级需求澄清 → specs/
└──────────┬───────────────────┘
            │ PRODUCT.md + specs/{分类}/{版本号}-xxx.md ✓
           ▼
┌──────────────────────────────┐
│  规划器 Planner               │  ← 技术设计，一次性输出
│  （基于需规，不做需求假设）     │
└──────────┬───────────────────┘
           │ plans/{功能名称}.md
           ▼
┌──────────────────────────────┐
│  评估器 Evaluator ①           │  ← Plan 审查门禁
│  （对照 specs + constraints） │
└──────┬───────────┬───────────┘
       │ FAIL      │ PASS
       ▼           ▼
     打回规划器   ┌──────────────────────────────┐
                 │  执行器 Executor              │  ← 拆 Task，并行实现
                 │  （严格遵循 plans，不做决策）  │
                 └──────────┬───────────────────┘
                            │ 代码 + 测试
                            ▼
                ┌──────────────────────────────┐
                │  评估器 Evaluator ②           │  ← 代码审查门禁
                │  （对照 spec+plan+constraints）│
                └──────┬───────────┬───────────┘
                      │ FAIL      │ PASS
                      ▼           ▼
                   打回执行器   git merge
                                 （人工审核）
```

每个角色各司其职，两个门禁节点确保质量和安全。

## File Structure · 文件结构

### Lupine 框架（GitHub 仓库）

```
Lupine/
├── CLAUDE.md                    # 框架自身 AI 入口
├── README.md                    # 框架介绍（面向人）
├── PRODUCT.md                   # 框架产品定义
├── rules/                       # 框架自身研发规范
│   ├── agents.md                # 角色定义与工作流
│   ├── coding.md                # 技术栈与编码约定
│   ├── evals.md                 # 评估门禁标准
│   ├── git.md                   # Git 协作规范
│   ├── release.md               # 发布规范
│   └── constraints.yaml         # 角色约束定义
├── specs/                       # 需求规格（给人读，WHAT + WHY）
│   └── 项目架构/
│       └── v1.0-产出物与角色模型-202605261400.md
├── plans/                       # 执行计划（给AI执行，只读）
├── reviews/                     # 审查报告
├── framework/init/              # 框架工具链
│   ├── lupine-init              # 项目初始化脚本（Python）
│   ├── template.yaml            # 结构定义 + Agent 跨平台配置
│   └── templates/               # 模板成品文件
│       ├── CLAUDE.md            # AI 索引入口
│       ├── PRODUCT.md           # 产品定义模板
│       ├── README.md            # 项目介绍模板
│       ├── agents/*.prompt      # Agent prompt 正文（跨平台共用）
│       └── rules/               # 成品规范文件
├── install.sh                   # 一键安装脚本
├── Makefile
└── bin/lupine-init              # symlink 到 framework/init/lupine-init
```

### 用户项目（`lupine-init` 初始化后）

```
my-project/
├── CLAUDE.md                    # AI 索引入口
├── README.md                    # 项目介绍
├── PRODUCT.md                   # 产品定位与愿景
├── .opencode/agents/            # Agent 定义
│   ├── lupine.md
│   ├── lupine-planner.md
│   ├── lupine-executor.md
│   └── lupine-evaluator.md
├── rules/
│   ├── agents.md                # 角色定义 + 工作流
│   ├── coding.md                # 编码规范
│   ├── evals.md                 # 评估门禁标准
│   ├── git.md                   # Git 协作规范
│   └── constraints.yaml         # 约束定义
├── specs/                       # 需求规格
├── plans/                       # 执行计划
└── reviews/                     # 审查报告
```

> peer 模式下，rules、reqs、plans 等目录放在 `.lupine/` 下，与 `frontend/` `backend/` 同级。

## 快速开始

### 1. 环境准备

| 依赖 | 用途 | 获取方式 |
|------|------|---------|
| opencode 或 Claude Code | AI 会话与 Agent 运行 | [opencode](https://opencode.ai) / [Claude Code](https://docs.anthropic.com/en/docs/claude-code/installation) |
| Python 3 + PyYAML | `lupine-init` 运行依赖 | `pip install pyyaml` |
| Git + Bash | 版本控制与脚本执行 | 系统自带或包管理器安装 |

### 2. 获取 Lupine 框架

```bash
# 方式一：Git 克隆（推荐，开发/贡献者）
git clone <仓库地址> lupine
cd lupine

# 方式二：curl 一键安装（快速下载）
curl -fsSL https://raw.githubusercontent.com/koalamini/lupine/master/install.sh | bash

# 方式三：Release 压缩包（离线/内网环境）
tar -xzf lupine-context-v*.tar.gz
cd lupine-context-v*
```

> `install.sh` 支持环境变量：`VERSION=v1.0.0`（指定版本）、`FORCE=1`（强制覆盖）、`DRY_RUN=1`（仅预览）。

### 3. 初始化你的项目

```bash
# embedded 模式：Lupine 嵌入项目内部（适合小型项目或现有项目引入）
/path/to/lupine/bin/lupine-init {project_name} ./.lupine --mode embedded

# peer 模式：Lupine 与 frontend/ backend/ 平级（适合中大型多模块项目）
/path/to/lupine/bin/lupine-init {project_name} ./.lupine --mode peer

# 指定 AI 平台（auto 自动检测 opencode/claude，默认 opencode）
/path/to/lupine/bin/lupine-init {project_name} ./.lupine --platform auto
```

`lupine-init` 会生成：

- **`CLAUDE.md`** — AI 索引入口（如果已有则追加，不覆盖）
- **`PRODUCT.md`** + **`README.md`** — 产品定义与项目介绍
- **`rules/`** — 四个规范文件（agents / coding / evals / git）
- **`.opencode/agents/`** 或 **`.claude/agents/`** — Agent 定义（跨平台渲染）
- **`specs/`**、**`plans/`**、**`reviews/`** — 空目录骨架

### 4. 启动流水线

进入项目目录，启动 AI 会话。系统自动读取 `CLAUDE.md`，以 **Lupine（狼王）** 角色开始工作。

Lupine 会与你对话澄清需求，然后依次调度子 Agent：

| 阶段 | 操作 | 产出物 |
|------|------|--------|
| 需求分析 | 与 Lupine 对话探讨需求 | `PRODUCT.md` + `specs/` |
| 技术设计 | Lupine 派规划器出方案 | `plans/` |
| Plan 审查 | Lupine 派评估器审查 | `reviews/*-plan.md` |
| 并行实现 | Lupine 派执行器写代码 | 代码 |
| 代码审查 | Lupine 派评估器审查 | `reviews/*-code.md` |
| PR 合并 | 人工审核后合并 | — |

> **不需要手动切换角色**。Lupine（狼王）作为主 Agent 自动协调分析器、规划器、执行器、评估器。
> 子 Agent 通过 `task` 工具调用，各自专注于自己的职责。

## When to Use Which Flow · 场景选择

| 场景 | 流程 |
|------|------|
| 新项目第一个功能 | 完整四角色流水线，含 PRODUCT.md 产出 |
| 已有项目加功能 | 完整流水线（CLAUDE/EVALS 已有） |
| 紧急线上 bug | 跳过分析+规划，直接执行+审查，事后补 specs/ |
| 改文案/文档 | 直接执行后审查 |

## Design Philosophy · 设计理念

1. **需求可追溯**——每个功能的代码都能追溯到确认过的需规
2. **质量可评估**——规划和代码两个阶段设置评估门禁
3. **并行可执行**——不耦合的模块可多 Agent 并行实现
4. **知识可持续**——项目约定、质量标准、架构决策文档化
5. **人类最终把关**——AI 提供效率，人工决定质量

## Limitations · 已知局限

- 分析器效率取决于用户配合程度
- 评估器推理能力依赖底层模型
- 多 session 并行时需要人工协调文件冲突
- 大 PR 审查可能有遗漏（模型上下文限制）
- Agent 规则依赖 AI 自主遵守，无强制机制

## Contributing · 贡献

欢迎通过 Issue 和 PR 参与改进。请参考 `CLAUDE.md` 中的 Git 协作规范提交。

## License

MIT
