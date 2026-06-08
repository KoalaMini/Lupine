# Lupine · AI 索引入口

> Lupine 项目由 Lupine 多 Agent 流水线驱动开发。
> 核心理念：从**独奏（Solo）**到**交响（Symphony）**。

## 项目名片

- **产品**：[ARCHITECTURE.md](./ARCHITECTURE.md)——项目架构全貌（产品定义/技术栈/基础设施）
- **功能状态**：[FEATURES.json](./FEATURES.json)——功能全景与当前状态
- **变更历史**：[CHANGELOG.md](./CHANGELOG.md)——版本维度的变更记录

## 文档地图

| 目的 | 位置 |
|------|------|
| 产品总纲 | `PRODUCT.md` |
| 需求规格 | `specs/`（按类别组织） |
| 提案评估 | `proposal/`（技术选型、架构方案） |
| 执行计划 | `plans/`（只读，给 AI 执行） |
| 审查记录 | `reviews/`（评估器产出，只读） |
| 编码规范 | `rules/coding.md` |
| 评估门禁 | 嵌入 `specs/` 对应需求的验收条件 |

## 进场协议

每个 session 开始时依序执行以下步骤恢复上下文：

**架构层（~20 秒）**
1. 读取 AGENT.md——确认文档地图
2. 读取 ARCHITECTURE.md——确认项目全貌
3. 如果之前读过且架构未变，跳过此层

**需求层（~30 秒）**
4. 读取 FEATURES.json——确认功能状态
5. 如果需要深入当前需求，读取对应 spec

**执行层（~10 秒）**
6. 执行 `git log --oneline -20`——确认最近变更
7. 执行 `git status`——确认工作区状态
8. 读取当前 `plans/`——确认下一步动作

## 进场指示灯

执行完协议后，输出一行状态摘要（不超过 3 行）：

```
📋 进场：架构层 Lupine · 需求层 [当前功能] ([状态]) · 执行层 [最近提交摘要]
```

> 源码区路径见 `.lupineconfig.json` → `repositories`。
