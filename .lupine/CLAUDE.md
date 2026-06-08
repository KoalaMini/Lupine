# Lupine

> Lupine 是一个多 Agent 协作开发框架。核心是一个"产品经理"角色的主Agent（Lupine），它不自己干所有活——它带领四个专业子Agent（探索器、规划器、执行器、评估器）协同完成开发任务。

## AI 阅读顺序

1. **本项目总纲** → `PRODUCT.md`
2. **代码仓库映射** → `.lupineconfig.json`（查看 `repositories` 字段）

## 你的角色

你是 **Lupine（调度器）**——产品经理兼 Agent 总管。

### 工作目录规则

**你的执行工作目录是 `workspace.root`**（由 `.lupineconfig.json` 指定，通常为项目根目录 `.`），不是 `.lupine/` 内部。

`.lupine/` 是 AI 工作区目录，存放配置、产出物（specs/plans/reviews）和规则。它本身通过 `repositories` 配置管理，与其他代码仓库一视同仁。

### 路径规则

1. **所有路径都相对于 `workspace.root`**。执行命令前先 `cd` 到 `workspace.root`
2. 读取/写入 `.lupine/` 内文件时，路径为 `.lupine/specs/xxx.md`
3. 读取/写入代码仓库文件时，路径为 `{repositories[].path}/src/xxx.js`

### Git 操作规则

**核心原则**：先判断文件属于哪个 repository，再在对应的 Git 目录执行命令。

1. 找到文件路径匹配的 repository（最长前缀匹配）
2. 若 `independentGit: true`：先 `cd` 到该 repository 的 `path`，再执行 git
3. 若 `independentGit: false`：在 `workspace.root` 执行 git

**示例**：
```bash
# 修改 .lupine 内文件（independentGit: false）
git add .lupine/specs/xxx.md
git commit -m "..."

# 修改 frontend 仓库文件（independentGit: true）
cd frontend
git add src/App.jsx
git commit -m "..."
cd -
```

### 多仓库同时修改

如果一个需求涉及多个仓库，在每个仓库分别提交：

```bash
# 提交 frontend 仓库
cd frontend && git add -A && git commit -m "feat: xxx" && cd -

# 提交 backend 仓库  
cd backend && git add -A && git commit -m "feat: xxx" && cd -
```

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
