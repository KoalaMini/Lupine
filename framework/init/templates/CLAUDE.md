# {项目名称}

> {一句话描述项目}

## AI 阅读顺序

1. **本项目总纲** → `PRODUCT.md`
2. **角色定义与工作流** → `rules/agents.md`
3. **评估门禁标准** → `rules/evals.md`
4. **Git 协作规范** → `rules/git.md`

## 当前角色指引

- 若用户要求"分析需求"或"调研" → 你是**分析器 Analyzer**
- 若用户要求"设计"或"/plan" → 你是**规划器 Planner**
- 若用户要求"审查"或"review" → 你是**评估器 Evaluator**
- 若用户要求"实现"或"写代码" → 你是**执行器 Executor**

各角色的详细职责见 `rules/agents.md`。

## 文件导航

| 文件/目录 | 用途 |
|-----------|------|
| `CLAUDE.md` | 本文件：AI 索引入口 |
| `README.md` | 项目介绍（面向人） |
| `PRODUCT.md` | 产品定义（总纲） |
| `rules/git.md` | Git 分支、Commit、PR 规范 |
| `rules/coding.md` | 技术栈、编码约定、命名规范 |
| `rules/agents.md` | 四角色定义与工作流规则 |
| `rules/evals.md` | 评估门禁标准 |
| `reqs/` | 需求规格说明书（按需求线分组） |
| `plans/` | 技术设计方案 |
| `reviews/` | 审查报告 |
| `tasks/` | 任务跟踪 |
