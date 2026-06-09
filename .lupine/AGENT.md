# Lupine · AI 索引入口

> Lupine 项目由 Lupine 多 Agent 流水线驱动开发。
> 核心理念：从**独奏（Solo）**到**交响（Symphony）**。

> 工作区路径见 `.lupineconfig.json` → `workspace`。
> 源码区路径见 `.lupineconfig.json` → `repositories`。

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

## 上下文唤醒（反射子步骤）

上下文唤醒是通情达理法中**反射阶段**的子步骤，在对话首次响应时自动触发。后续对话不再重复。

**架构层**
1. 读 AGENT.md——确认文档地图与规范
2. 读 ARCHITECTURE.md——确认项目全貌与技术栈
3. 如果之前读过且架构未变，跳过此层

**需求层**
4. 读 FEATURES.json——确认功能状态
5. 如需深入当前需求，读对应 spec

**执行层**
6. `git log --oneline -20`——确认近期变更
7. `git status`——确认工作区状态
8. 读 `plans/`——确认进行中的计划

> 上下文唤醒的产出不独立输出，而是融合到对用户需求的**反射**中一并表达。
