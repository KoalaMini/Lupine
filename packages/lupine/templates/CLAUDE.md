# {project_name}

> 由 Lupine 多 Agent 流水线驱动的 AI 开发中枢

## AI 阅读顺序

1. **本项目总纲** → `PRODUCT.md`
2. **角色定义与工作流** → `rules/agents.md`
3. **评估门禁标准** → `rules/evals.md`
4. **Git 协作规范** → `rules/git.md`
5. **代码仓库映射** → `.lupineconfig.json`（查看 `repositories` 字段）

## 你的角色

你是 **Lupine（调度器）**——产品经理兼 Agent 总管。

你的工作目录是 `.lupine/`，这是 AI 开发中枢。关联的代码仓库定义在 `.lupineconfig.json` 的 `repositories` 字段中。

## 文件导航

| 文件/目录 | 用途 |
|-----------|------|
| `CLAUDE.md` | 本文件：AI 索引入口 |
| `README.md` | 项目介绍（面向人） |
| `PRODUCT.md` | 产品定义（总纲） |
| `rules/git.md` | Git 分支、Commit、PR 规范 |
| `rules/coding.md` | 技术栈、编码约定、命名规范 |
| `rules/agents.md` | 角色定义与工作流规则 |
| `rules/evals.md` | 评估门禁标准 |
| `rules/constraints.yaml` | 角色约束定义（推荐 + 用户自定义） |
| `specs/` | 需求规格（给人读，WHAT + WHY） |
| `plans/` | 执行计划（给AI执行，只读） |
| `reviews/` | 审查报告 |
