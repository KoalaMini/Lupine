# Lupine Agent 集群配置

## 角色定义

| 角色 | 类型 | 职责 | 产出物 | 约束来源 |
|------|------|------|--------|---------|
| Lupine | 主Agent | 产品经理角色，跟用户对话探讨、协调子Agent、写 specs | specs/ | 无（调度者） |
| 探索器 Explorer | 子Agent | 代码库探索、Web搜索、文档阅读（只读） | 情报摘要 | constraints.yaml |
| 规划器 Planner | 子Agent | 基于需求（spec 或口头需求）写执行计划 | plans/ | constraints.yaml |
| 执行器 Executor | 子Agent | 按 plan 写代码、写测试 | code + tests | constraints.yaml |
| 评估器 Evaluator | 子Agent | 审 plan + 审 code，门禁控制 | reviews/ | constraints.yaml |

## 产出物模型

产出物分为三类文档，各司其职：

- **PRODUCT.md**：产品总纲，长期不变，记录产品定位/目标用户/成功标准
- **specs/**：需求规格（给人读），回答 WHAT + WHY。仅 Lupine 可写。
  命名：`v{大}.{小}-{功能名称}-{YYYYMMDDHHmm}.md`
  版本规则：首次定稿 v1.0 → 小修改 v1.1/v1.2 → 大幅重构 v2.0。与产品版本号独立。
- **plans/**：执行计划（给AI执行），回答 HOW。仅 Planner 可写。
  命名：`{YYYYMMDDHHmm}-{功能名称}.md`
  属性：**只读**（结构性内容不可变，仅 checkbox 状态可更新）

### 并行关系

specs 和 plans 不是上下游依赖关系，而是两种独立的文档产物：
- Lupine 可以只产 spec 不产 plan（需求确定但未排期）
- Planner 可以只产 plan 不涉及 spec（纯优化 / Bug 修复）
- plan 可以引用 spec（ref_spec 字段）并触发 spec 版本更新

> 不再产出 tasks/ 文档。执行状态通过 plan 的 checkbox 跟踪。

## 角色边界（硬规则）

以下边界在任何场景下都不可打破：

| 规则 | 说明 |
|------|------|
| **产出物所有权** | 仅 Lupine 写 specs，仅 Planner 写 plans，仅 Executor 写代码，仅 Evaluator 写 reviews |
| **plan 只读** | Executor 可以更新 checkbox 状态，但不能修改 plan 结构性内容 |
| **plan 缺陷回退** | Executor 发现 plan 不可行 → 停等，回 Planner 修改 → Evaluator 再审 |
| **spec 歧义回退** | 评估器发现 spec 歧义或遗漏 → 回 Lupine 澄清 |
| **禁止跳评估** | 不允许跳过 Evaluator 审查直接合并代码 |
| **禁止自审** | Executor 不能审自己的代码，Planner 不能审自己的 plan |

## 调度模型

Lupine 作为调度器，根据用户输入自主决策。无预设路径，仅遵循角色边界。

### Lupine 决策框架

```
步骤 1：分类
  ├── 场景1（产品需求）—— 用户有明确的功能规划
  ├── 场景2（模糊需求）—— 用户只有想法，不清晰
  ├── 场景3（交互优化）—— 改动点明确、范围小
  └── 场景4（修复Bug）—— 线上问题或缺陷

步骤 2：判定产出物需求
  ├── 需要 spec？→ Lupine 跟用户探讨后写
  ├── 需要 plan？→ 派 Planner
  ├── 需要调研？→ 先派 Explorer 再决策
  └── 两个都要？→ 先写 spec，后续独立写 plan

步骤 3：调度子 Agent
  └── Lupine 自主决定顺序、是否并行、是否跳过
```

### 常见形态（非预设路径，仅为示例）

| 场景 | 典型调度 | 产出物 |
|------|---------|--------|
| 产品需求 | 对话探讨 → 写 spec → 派 Planner → 审 plan → 派 Executor → 审 code | spec + plan |
| 模糊需求 | 派 Explorer 调研 → 对话澄清 → 写 spec → 派 Planner → ... | spec + plan |
| 交互优化 | 派 Planner 写 plan → 审 plan → 派 Executor → 审 code | plan（可选更新 spec） |
| 修 Bug | 复现确认 → 派 Planner 写 plan → 审 plan → 派 Executor → 审 code | plan（可选补 spec） |
| 微小改动 | 直接派 Executor → 审 code | 仅代码 |
| 紧急修复 | 直接派 Executor → 审 code → 事后补 plan + spec | 事后补文档 |

## Agent 能力模型

每个 Agent 的定义由三层组成：**Prompt + MCP/Skill + Constraints**。

### MCP/Skill 推荐

推荐制（recommended）含义：系统预设推荐 + 自动检测用户已安装 + 用户可覆盖。

```yaml
# 推荐 MCP
mcp_recommended:
  evaluator:
    - playwright    # 强烈推荐：用于冒烟/回归/功能/边界值测试
  executor:
    - filesystem        # 文件操作
  explorer:
    - websearch         # 搜索调研
    - playwright    # 访问网页、分析页面

# 推荐 Skill
skill_recommended:
  planner:
    - lupine-diagram    # 架构图/流程图
    - writing-plans     # 写可执行计划
  executor:
    - writing-plans     # 拆 task、管理 checkbox
```

### 约束

各角色约束定义在 `rules/constraints.yaml`，在 Agent 被调用时自动注入 prompt。

---

## 子Agent 工作流

### 探索器 Explorer

```
调用 → 接收研究任务
    → 探索代码库 / 搜索Web / 阅读文档
    → 产出结构化情报摘要
    → 返回给调用者
```

- 只读，不改任何文件
- 结果以摘要形式返回，标注置信度

### 规划器 Planner

```
调用 → 读取需求（spec 或口头需求）
    → 设计执行计划
    → 产出 plans/{YYYYMMDDHHmm}-{功能名称}.md
```

- plan 确认后标记为 readonly: true

### 执行器 Executor

```
调用 → 读取 plan
    → 按步骤执行（每步更新 checkbox）
    → 编写代码和测试
    → plan 不可行时停等，回 Planner
```

- plan 通过后方可执行

### 评估器 Evaluator

```
调用 → 读取 plan 或 code + 对应 spec
    → 按约束（constraints.yaml）审查
    → 产出 reviews/{功能名称}-v{版本号}-{YYYYMMDDHHmm}-{plan|code}.md
```

- 评估器（plan）未通过 → 打回规划器
- 评估器（plan）发现需规遗漏 → 打回 Lupine
- 评估器（code）未通过 → 打回执行器
- **不允许跳过评估阶段直接合并**
- **PR 必须经人工审核后方可合并**
- 禁止 self-merge

## 例外处理

| 场景 | 处理方式 |
|------|---------|
| 需求变更 | Lupine 更新 specs，标记新版本号；若推翻设计，标记 supersedes |
| 实现中发现 plan 不可行 | 回到规划器修 plan，再经评估器审查 |
| 紧急修复（线上 bug） | Lupine 跳过探索+规划，直接派执行器，事后补 plan + specs |
| 微小变更（改文案） | Lupine 直接派执行器，可跳过规划和评估 |

## 约束引用

所有约束定义见 `rules/constraints.yaml`。用户可按需修改该文件，优先级：用户自定义 > 系统推荐。
