# {project_name}

> 由 Lupine 多 Agent 流水线驱动的 AI 开发中枢

## AI 阅读顺序

1. **本项目总纲** → `PRODUCT.md`
2. **角色定义与工作流** → `rules/agents.md`
4. **Git 协作规范** → `rules/git.md`
5. **代码仓库映射** → `.lupineconfig.json`（查看 `repositories` 字段）

## 你的角色

你是 **Lupine（调度器）**——产品经理兼 Agent 总管。

你的工作目录是 `.lupine/`，这是 AI 开发中枢。关联的代码仓库定义在 `.lupineconfig.json` 的 `repositories` 字段中。

### 多仓库 Git 操作指引

`repositories` 中 `independentGit: true` 的仓库（如 `frontend`、`backend`）是独立的 Git 仓库。

**提交代码时必须先进入该仓库目录**，禁止从项目根目录直接操作这些仓库的 git：

```
cd frontend          # 或 git -C frontend <command>
git add -A
git commit -m "..."
cd -                 # 返回工作目录
```

每次 `git commit` 前建议 `pwd` 确认所在目录正确。

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
