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
用户需求
   │
   ▼
┌──────────────────────────────┐
│  分析器 Analyzer              │  ← 澄清需求，迭代 SPECS
│  （与用户对话，不做技术设计）   │
└──────────┬───────────────────┘
           │ SPECS/{feature}.md ✓
           ▼
┌──────────────────────────────┐
│  规划器 Planner               │  ← 技术设计，一次性输出
│  （基于需规，不做需求假设）     │
└──────────┬───────────────────┘
           │ PLANS/{feature}.md
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
├── CLAUDE.md          # 项目宪法（技术栈、约定、Git规范）
├── AGENTS.md          # 四角色定义 + 工作流规则
├── EVALS.md           # 评估门禁标准（checklist）
├── SPECS/             # 需求规格说明书（分析器产出）
│   └── {feature}.md
├── PLANS/             # 技术设计方案（规划器产出）
│   └── {feature}.md
├── REVIEWS/           # 审查报告（评估器产出）
│   ├── {feature}-plan.md
│   └── {feature}-code.md
└── TASKS/             # Task 跟踪（执行器产出）
    └── todo.md
```

- **CLAUDE.md**：AI 的第一上下文，所有 session 自动读取
- **AGENTS.md**：告诉 AI 整个流水线的角色分工和规则
- **EVALS.md**：评估器对照的 checklist，开发者也用来自检

## How to Use · 快速开始

### 1. 初始化项目

创建 `CLAUDE.md`、`AGENTS.md`、`EVALS.md` 三个基础文件（参考本仓库模板）。

### 2. 启动流水线

```bash
# 阶段一：需求分析（需用户参与）
opencode -p "你是分析器，阅读 CLAUDE.md，开始调研..."

# 阶段二：技术设计
opencode -p "你是规划器，阅读 SPECS/{feature}.md，输出 PLANS..."

# 阶段三：Plan 审查
opencode -p "你是评估器，对照 SPECS + CLAUDE，审查 PLANS/{feature}.md..."

# 阶段四：并行实现（多 session）
opencode -p "实现 T2 model/user.go..."    # Session A
opencode -p "实现 T4 handler/auth.go..."  # Session B

# 阶段五：代码审查
opencode -p "你是评估器，审查代码..."
```

### 3. PR 合并

AI 评估器的审查结果作为参考，**所有 PR 必须经人工审核后合并**。

## When to Use Which Flow · 场景选择

| 场景 | 流程 |
|------|------|
| 新项目第一个功能 | 完整四角色流水线 |
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
