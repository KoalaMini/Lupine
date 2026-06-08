# Changelog

## v0.8（计划）

- 进场仪式自动化：Lupine 进场时自动执行三层协议
- AGENT.md 进场协议展开为三层流程（架构层/需求层/执行层）
- `lupine init` 增强：初始化时主动探查源码区生成 ARCHITECTURE.md
- 用户项目模板更新：init 创建的新项目包含 v0.7 文档结构
- 规划器/执行器 prompt 微调：增加"执行进场协议"指引

## v0.7（当前）

- **进场仪式**：AGENT.md 精简为导航目录，新增进场指示灯
- **进场仪式**：新增 ARCHITECTURE.md 项目名片（产品/技术/基础设施三段式）
- **进场仪式**：FEATURES.json 简化，去除 history 数组，精简字段
- **文档结构**：新增 CHANGELOG.md 统一版本变更管理
- **文档结构**：specs/*.md 移除变更记录段落（specs = 当前状态原则）
- **更名**：CLAUDE.md → AGENT.md（去品牌化 + 纯导航）
- **编码规范**：rules/coding.md 增加提交时机指引（可回退原则：plan step + 测试通过触发 commit）

## v0.6

- 需求管理优化：新增 proposal/ 产出物类型；需求分类体系（product/business/technical）
- 配置架构重构：workspace 与 repositories 解耦，支持独立 Git 仓库
- Skill 管理：`lupine skill` 命令族（add/list/remove），支持多种来源安装
- 编码规范：rules/coding.md 和 rules/evals.md 初版
- 边界管理：引入 FEATURES.json 功能清单（Agent 多会话上下文恢复）
