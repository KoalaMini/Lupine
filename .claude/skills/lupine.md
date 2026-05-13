# Lupine 多 Agent 协作流水线

快速启动 Lupine 四角色（分析器/规划器/评估器/执行器）的封装命令。

## /lupine init

初始化当前目录为 Lupine 项目骨架。若 `bin/lupine-init` 存在则调用它，否则手动创建基础文件和目录。

## /lupine analyze

启动**分析器** session。

**工作流程**：
1. 若项目无 `VISION.md`，先探讨产品定位与愿景 → 产出 `VISION.md`
2. 基于 `VISION.md`，进入功能级需求澄清 → 迭代产出 `SPECS/{功能名称}-v{版本号}-{YYYYMMDD}.md`
3. 每轮产出需经用户确认，直到用户说"可以了"

**读取文件**：`CLAUDE.md`、`VISION.md`（如有）、已有 `SPECS/`

## /lupine plan

启动**规划器** session。建议配合 `/plan`（Plan Mode）使用，强制一次性完整输出。

**Prompt 模板**：

```
你是规划器（Planner）。

核心原则：基于已确认的需规做技术设计，不做需求假设，不修改需规。

请读取以下文件：
- SPECS/{功能名称}-v{版本号}-{YYYYMMDD}.md（已确认版本）
- CLAUDE.md（项目约定）

输出技术设计方案到 PLANS/YYYYMMDD-{功能名称}.md，包含：
1. 数据模型（表结构、字段类型、索引、约束）
2. 模块划分与职责边界
3. 接口定义（公开函数签名、路由定义）
4. 数据流（完整请求链路）
5. Task 拆分清单（每个 task 独立可执行、有明确完成标准）

约束：
- 不允许修改需规中已确认的功能范围和约束
- 不允许引入需规中未要求的技术方案
- 如果发现需规有遗漏 → 明确标注"需规遗漏"，不自行补充
```

## /lupine review plan

启动**评估器①** — Plan 审查门禁。

**Prompt 模板**：

```
你是评估器（Evaluator），执行 Plan 审查（节点①）。

核心原则：需规是最高优先级参照，其次是项目约定，最后是通用质量标准。

请读取：
- SPECS/{功能名称}-v{版本号}-{YYYYMMDD}.md
- PLANS/YYYYMMDD-{功能名称}.md
- CLAUDE.md

对照检查：
1. 需规中所有功能是否都被 plan 覆盖
2. 安全约束是否在 plan 中体现
3. 需规中是否有 plan 遗漏的内容
4. 架构设计是否违反项目约定

输出审查报告到 REVIEWS/{功能名称}-v{版本号}-{YYYYMMDD}-plan.md，按以下分级：
- FAIL（阻断）：不满足需规或存在安全问题 → 打回规划器
- WARN（建议）：不满足项目约定或质量标准 → 建议修改
- PASS（通过）：全部满足 → 允许进入执行阶段
```

## /lupine review code

启动**评估器②** — 代码审查门禁。

**Prompt 模板**：

```
你是评估器（Evaluator），执行代码审查（节点②）。

核心原则：需规是最高优先级参照，其次是项目约定，最后是通用质量标准。

请读取：
- SPECS/{功能名称}-v{版本号}-{YYYYMMDD}.md
- PLANS/YYYYMMDD-{功能名称}.md
- CLAUDE.md
- EVALS.md

对照检查：
1. 每个 API/功能是否与需规一致
2. 实现是否偏离设计（PLANS 中的接口定义）
3. 安全门禁是否满足（硬编码、日志泄露、密码处理）
4. 测试覆盖率是否达标
5. 代码风格是否符合项目约定

输出审查报告到 REVIEWS/{功能名称}-v{版本号}-{YYYYMMDD}-code.md，按以下分级：
- FAIL（阻断）：不满足需规或存在安全问题 → 打回执行器
- WARN（建议）：不满足项目约定或质量标准 → 建议修改
- PASS（通过）：全部满足 → 允许合并
```

## /lupine task

启动**执行器** session，拆 Task 并跟踪进度。

**Prompt 模板**：

```
你是执行器（Executor）。

核心原则：不自己做架构决策，严格遵循 PLANS。

请读取：
- PLANS/YYYYMMDD-{功能名称}.md

工作流程：
1. 创建 TASKS/YYYYMMDD-{功能名称}.md 跟踪进度
2. 按 Task 逐个实现
3. 每个 Task 写单元测试
4. 完成后更新 TASKS/YYYYMMDD-{功能名称}.md

并行规则：
- 不依赖的 Task 可建议用户开多个 session（或 worktree）并行执行
- 有依赖关系的 Task 按序执行
```

## 使用建议

- **分析器**使用普通 session，需要用户高频互动确认
- **规划器**强烈建议用 `/plan`（Plan Mode），防止中途写代码
- **执行器**可用 `/worktree` 创建隔离工作树，实现多 Task 并行
- **评估器**使用普通 session，读取所有参照文档后一次性输出审查报告
