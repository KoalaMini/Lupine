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

### 2. 初始化 .lupine/ 工作区

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
├── .lupineconfig.json              ← 配置（仓库路径、平台等）
├── .lupine-version                 ← 版本标记
├── rules/                          ← 规范文件（agents/coding/evals/git/release）
├── specs/                          ← 需求规格（空目录）
├── plans/                          ← 执行计划（空目录）
├── reviews/                        ← 审查报告（空目录）
└── .opencode/agents/               ← Agent 定义（根据平台生成）
    ├── lupine.md
    ├── lupine-planner.md
    ├── lupine-executor.md
    └── lupine-evaluator.md
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
├── CLAUDE.md                       # 框架自身 AI 入口
├── README.md                       # 本文件
├── PRODUCT.md                      # 产品定义
├── rules/                          # 框架研发规范
│   ├── agents.md / coding.md / evals.md / git.md / release.md
│   └── constraints.yaml
├── specs/                          # 需求规格
├── plans/                          # 执行计划
├── reviews/                        # 审查报告
├── packages/
│   └── lupine/                     ← npm CLI 包源码
│       ├── bin/lupine.js           # CLI 入口
│       ├── src/                    # 命令实现
│       │   ├── main.js / init.js / update.js
│       │   ├── generate.js / config.js / checksum.js / agents.js
│       ├── scripts/sync-templates.js  # 模板同步
│       └── templates/              # 模板文件集（11+ 文件）

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

从需求到代码合并经过两个门禁节点（plan 审查 + code 审查），每个 Agent 职责明确，产出可追溯。

---

## 已知局限

- 评估器推理能力依赖底层模型
- 多 session 并行时需要人工协调文件冲突
- 大 PR 审查可能有遗漏（模型上下文限制）
- Agent 规则依赖 AI 自主遵守，无强制机制

---

## 贡献

欢迎通过 Issue 和 PR 参与改进。请参考 `CLAUDE.md` 中的 Git 协作规范提交。

---

## License

MIT
