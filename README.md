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
│  分析器 Analyzer              │  ← 产品定位与愿景 → VISION.md
│  （与用户对话，不做技术设计）   │  ← 功能级需求澄清 → SPECS
└──────────┬───────────────────┘
           │ VISION.md + SPECS/{功能名称}.md ✓
           ▼
┌──────────────────────────────┐
│  规划器 Planner               │  ← 技术设计，一次性输出
│  （基于需规，不做需求假设）     │
└──────────┬───────────────────┘
           │ PLANS/{功能名称}.md
           ▼
┌──────────────────────────────┐
│  评估器 Evaluator ①           │  ← Plan 审查门禁
│  （对照 SPECS + CLAUDE）      │
└──────┬───────────┬───────────┘
       │ FAIL      │ PASS
       ▼           ▼
     打回规划器   ┌──────────────────────────────┐
                 │  执行器 Executor              │  ← 拆 Task，并行实现
                 │  （严格遵循 PLANS，不做决策）  │
                 └──────────┬───────────────────┘
                            │ 代码 + 测试
                            ▼
               ┌──────────────────────────────┐
               │  评估器 Evaluator ②           │  ← 代码审查门禁
               │  （对照 SPECS+PLANS+EVALS）    │
               └──────┬───────────┬───────────┘
                      │ FAIL      │ PASS
                      ▼           ▼
                   打回执行器   git merge
                                 （人工审核）
```

每个角色各司其职，两个门禁节点确保质量和安全。

## File Structure · 文件结构

```
project-root/
├── CLAUDE.md          # AI 索引入口（轻量导航）
├── README.md          # 项目介绍（面向人）
├── VISION.md          # 产品定位与愿景（分析器产出，项目级）
├── rules/
│   ├── git.md         # Git 协作规范
│   ├── coding.md      # 技术栈与编码规范
│   ├── agents.md      # 四角色定义 + 工作流规则
│   └── evals.md       # 评估门禁标准（安全/质量/架构门禁 + 扩展检查项）
├── specs/             # 功能级需求规格说明书（分析器产出）
│   └── {功能名称}-v{主.次}-{YYYYMMDDHHmm}.md
├── plans/             # 技术设计方案（规划器产出）
│   └── YYYYMMDDHHmm-{功能名称}.md
├── reviews/           # 审查报告（评估器产出）
│   ├── {功能名称}-v{主.次}-{YYYYMMDDHHmm}-plan.md
│   └── {功能名称}-v{主.次}-{YYYYMMDDHHmm}-code.md
├── tasks/             # 任务跟踪（执行器产出）
│   └── YYYYMMDDHHmm-{功能名称}.md
├── assets/            # 初始化模板（框架内部使用）
└── bin/
    └── lupine-init    # 项目初始化脚本
```

- **CLAUDE.md**：AI 的第一上下文，所有 session 自动读取
- **VISION.md**：分析器产出的产品总纲，所有功能需求的锚点
- **rules/**：所有规范类文件聚合处

## 快速开始

### 1. 环境准备

| 依赖 | 用途 | 获取方式 |
|------|------|---------|
| Claude Code | AI 会话与 Skill 运行 | [官方安装指南](https://docs.anthropic.com/en/docs/claude-code/installation) |
| Git + Bash | 版本控制与脚本执行 | 系统自带或包管理器安装 |
| opencode（可选） | 开源替代方案 | [opencode 文档](https://opencode.ai) |

### 2. 安装 Lupine

**步骤一：获取框架（选择任一方式）**

```bash
# 方式一：Git 克隆（推荐，开发/贡献者）
git clone <仓库地址> lupine
cd lupine

# 方式二：curl 一键安装（快速接入现有项目）
curl -fsSL https://raw.githubusercontent.com/koalamini/lupine/master/install.sh | bash

# 方式三：Release 压缩包（离线/内网环境）
# 从 GitHub Releases 下载 lupine-context-vX.Y.Z.tar.gz
tar -xzf lupine-context-v*.tar.gz
cd lupine-context-v*
```

**步骤二：安装 Claude Code Skills（一次性）**

```bash
./scripts/install-skills.sh
```

> `install.sh` 支持环境变量：`VERSION=v1.0.0`（指定版本）、`FORCE=1`（强制覆盖）、`DRY_RUN=1`（仅预览）。

安装完成后，在 Claude Code 中可使用以下快捷指令切换角色：

| 指令 | 角色 | 阶段 |
|------|------|------|
| `/lupine-analyzer` | 分析器 | 需求分析 |
| `/lupine-planner` | 规划器 | 技术设计 |
| `/lupine-executor` | 执行器 | 代码实现 |
| `/lupine-evaluator` | 评估器 | 质量审查 |

### 3. 初始化你的项目

```bash
# 方式一：初始化脚本（推荐）
/path/to/lupine/bin/lupine-init [项目名] [目录]

# 方式二：手动复制模板
cp -r /path/to/lupine/assets/* ./my-project/
```

初始化后目录结构：

```
my-project/
├── CLAUDE.md    # AI 索引入口
├── README.md    # 项目介绍
├── VISION.md    # 产品定位与愿景
├── rules/       # Git / 编码 / Agent / 评估 规范
├── specs/       # 需求规格说明书
├── plans/       # 技术设计方案
├── reviews/     # 审查报告
└── tasks/       # 任务跟踪
```

### 4. 启动流水线

进入项目目录，按阶段调用对应 skill：

| 阶段 | 指令 | 产出物 |
|------|------|--------|
| 需求分析 | `/lupine-analyzer` | `VISION.md` + `specs/` |
| 技术设计 | `/lupine-planner` | `plans/` |
| Plan 审查 | `/lupine-evaluator` | `reviews/*-plan.md` |
| 并行实现 | `/lupine-executor`（多 worktree） | 代码 + `tasks/` |
| 代码审查 | `/lupine-evaluator` | `reviews/*-code.md` |

> **注意**：分析器阶段需要用户参与确认需求；执行器阶段可通过 `claude /worktree` 启动多个并行 session。

### 5. PR 合并

AI 评估器的审查结果作为参考，**所有 PR 必须经人工审核后合并**。

## When to Use Which Flow · 场景选择

| 场景 | 流程 |
|------|------|
| 新项目第一个功能 | 完整四角色流水线，含 VISION.md 产出 |
| 已有项目加功能 | 完整流水线（CLAUDE/EVALS 已有） |
| 紧急线上 bug | 跳过分析+规划，直接执行+审查，事后补 SPECS |
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
