---
name: lupine-requirements-management
description: 需求管理工具集：FEATURES.json 维护、proposal 写作范式、需求分类参考
---

# lupine-requirements-management

Lupine 在做需求管理时的操作指引。当需要更新功能清单、写提案、或做需求分类标记时，加载此 skill。

---

## 1. FEATURES.json 维护流程

Lupine 判断触发"需要更新功能清单"时，按以下步骤执行：

### 1.1 触发条件

以下任意情况发生后需检查 FEATURES.json：
- 新增了一个功能（新建了 spec）
- 已有功能的 spec 发生了迭代（更新了现有 spec）
- 功能状态变化（planned → in-progress → completed）
- spec 被重构或拆分，currentSpec 引用变化

### 1.2 维护步骤

```
① 读取当前 FEATURES.json
   - 记录 manifest.version、lastUpdated
   - 列出已有 features 的 id 和 name

② 判断变更类型：
   a) 全新功能 → 生成新 id（按序递增 F6, F7...）
   b) 现有功能状态变化 → 更新 feature.status，追加 history[]
   c) 现有 spec 被替换 → 更新 currentSpec 引用
   d) 功能废弃 → 追加 history[] 标注 superseded，保留条目不删除

③ 写入 FEATURES.json：
   - 保持 JSON 格式不变（缩进、排序）
   - 更新 manifest.lastUpdated 为当天
   - 更新 manifest.totalFeatures

④ 一致性校验：
   - currentSpec 指向的文件必须存在
   - totalFeatures === features.length
   - 所有 feature.id 无重复
```

### 1.3 history 追加规则

```json
// 新版本追加到 history 数组头部（最新在最前）
{
  "version": "0.7",
  "change": "变更内容描述",
  "status": "completed"   // 或 "in-progress"
}
```

- 每次 spec 迭代产生一个新的 history 条目
- 被取代的旧版本标记 `"status": "superseded"`（自动将旧条目标为 superseded）

---

## 2. Proposal 写作范式

### 2.1 位置与命名

```
proposal/
├── YYYYMMDD-<slug>.md       ← 提案文件
└── proposal.assets/          ← 关联资源（图、表等）
```

命名示例：`20260608-技术栈迁移方案.md`

### 2.2 内容范式

```markdown
---
title: <提案标题>
date: YYYY-MM-DD
status: draft | reviewing | decided | abandoned
type: architecture | tech-selection | product-strategy
---

# <标题>

## 背景与问题

（为什么需要这个提案？解决什么问题？不做的代价是什么？）

## 方案对比

| 方案 | 优点 | 缺点 | 风险 |
|------|------|------|------|
| 方案A | ... | ... | ... |
| 方案B | ... | ... | ... |

## 推荐方案与理由

（选哪个？为什么？关键决策依据）

## 影响范围

（涉及哪些模块、角色、产出物？需要联动更新什么？）

## 决策记录

| 日期 | 决策者 | 决策 | 备注 |
|------|--------|------|------|
| YYYY-MM-DD | Lupine + 用户 | 选定方案A | — |
```

### 2.3 Proposal vs Spec 定位

| 维度 | proposal/ | specs/ |
|------|-----------|--------|
| 回答的问题 | **应该选哪个方案？** | **具体要做什么？** |
| 读者 | 决策者（人 + Lupine） | 开发者（人 + 规划器） |
| 生命周期 | 决策后可能归档 | 持续演进到产品交付 |
| 典型内容 | A/B 方案对比、调研结论、架构决策 | 功能定义、约束条件、验收标准 |

适用场景：技术选型、架构方案评审、产品方向决策、技术债务治理规划。

---

## 3. 需求分类参考

Lupine 在"决策框架第一步（分类）"时参考的分类体系：

| 分类 | 子类 | 典型例子 |
|------|------|---------|
| **product** | functional | 用户能上传文件、搜索结果排序、登录流程 |
| **product** | nonfunctional | 页面加载 < 2s、支持 1000 并发、无障碍合规 |
| **business** | growth | 注册转化率提升 20%、用户留存优化 |
| **business** | metric | 降低 P95 延迟、提升 API 成功率至 99.9% |
| **technical** | architecture | 从 REST 迁移到 GraphQL、微服务拆分 |
| **technical** | tech-debt | 升级依赖版本、统一错误处理、重构支付模块 |

**使用方式**：Lupine 在对话中判断需求类型后，在 spec 或提案的 frontmatter 中标记 `type` 字段。不硬性改变调度行为，仅作为 Lupine 决策的参考信息。
