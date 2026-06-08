# 项目架构

## 产品架构

Lupine 是一个多 Agent 协作开发框架。核心是一个"产品经理"角色的主 Agent（Lupine），它带领四个专业子 Agent（探索器、规划器、执行器、评估器）协同完成开发任务。

核心理念：从**独奏（Solo）**到**交响（Symphony）**——多个有明确角色分工的 Agent 协同工作，每个阶段有产出、有审查、可追溯。

**五角色分工**：

| 角色 | 类型 | 职责 | 产出物 |
|------|------|------|--------|
| Lupine | 主 Agent | 调度器 + 产品经理，对话探讨、写 specs/proposal、调度子 Agent | PRODUCT.md + proposal/ + specs/ |
| 探索器 | 子 Agent | 代码库探索、Web 搜索、文档阅读（只读） | 情报摘要 |
| 规划器 | 子 Agent | 基于需求写执行计划 | plans/ |
| 执行器 | 子 Agent | 按 plan 写代码、写测试 | code + tests |
| 评估器 | 子 Agent | 按约束审 plan + 审 code，门禁控制 | reviews/ |

## 技术架构

- **运行环境**：Node.js 20+
- **语言框架**：纯 JavaScript（ESM），无框架（CLI 工具）
- **关键依赖**：`commander`（CLI 解析）、`chalk`（终端输出）
- **测试框架**：Vitest
- **包管理**：npm workspaces（monorepo）
- **分发渠道**：npm registry（`lupine` CLI）+ GitHub Release tarball（双渠道）
- **Monorepo 结构**：

```
Lupine/
├── .lupine/                        ← AI 工作区（配置 + 产出物）
├── packages/
│   └── lupine/                     ← npm CLI 包源码
│       ├── bin/lupine.js           # CLI 入口
│       ├── src/                    # 命令实现（init/update/skill 等）
│       ├── templates/              # 模板文件集
│       └── tests/                  # 测试
└── .github/workflows/              ← CI/CD
```

## 基础设施

| 命令 | 用途 |
|------|------|
| `npm run dev` | 启动本地开发 |
| `npm test` | 运行测试（Vitest） |
| `npm run build` | 构建 CLI 包 |
| `npm run release` | 发布到 npm |
| CI | GitHub Actions（`.github/workflows/`） |
