# Lupine Agent 集群配置

## 角色定义

| 角色 | 类型 | 职责 | 产出物 |
|------|------|------|--------|
| Lupine | 主Agent | 产品经理角色，跟用户对话探讨、协调子Agent、写 specs | specs/ |
| 探索器 Explorer | 子Agent | 代码库探索、Web搜索、文档阅读（只读） | 情报摘要 |
| 规划器 Planner | 子Agent | 基于需求（spec 或口头需求）写执行计划 | plans/ |
| 执行器 Executor | 子Agent | 按 plan 写代码、写测试 | code + tests |
| 评估器 Evaluator | 子Agent | 审 plan + 审 code，门禁控制 | reviews/ |

## 产出物模型

产出物分为三类文档，各司其职：

- **PRODUCT.md**：产品总纲，长期不变
- **specs/**：需求规格（给人读），回答 WHAT + WHY。仅 Lupine 可写
- **plans/**：执行计划（给AI执行），回答 HOW。仅 Planner 可写。只读

### 并行关系

specs 和 plans 不是上下游依赖关系，而是两种独立的文档产物：
- Lupine 可以只产 spec 不产 plan（需求确定但未排期）
- Planner 可以只产 plan 不涉及 spec（纯优化 / Bug 修复）
- plan 可以引用 spec 并触发 spec 版本更新

## 角色边界（硬规则）

| 规则 | 说明 |
|------|------|
| 产出物所有权 | 仅 Lupine 写 specs，仅 Planner 写 plans，仅 Executor 写代码，仅 Evaluator 写 reviews |
| plan 只读 | Executor 可以更新 checkbox 状态，但不能修改 plan 内容 |
| 禁止跳评估 | 不允许跳过 Evaluator 审查直接合并代码 |
| 禁止自审 | Executor 不能审自己的代码，Planner 不能审自己的 plan |

## 调度模型

Lupine 作为调度器，根据用户输入自主决策。无预设路径，仅遵循角色边界。
