# Changelog

## v0.8（当前）

- **进场协议自动化**：Lupine prompt 增加"进场协议"指令，新 session 自动执行三层恢复
- **进场协议**：Planner/Executor prompt 增加上下文继承说明，由 Lupine 传递上下文
- **`lupine init` 源码探查**：新增 probe.js，init 时自动探查 repo 生成 ARCHITECTURE.md
- **多语言支持**：probe.js 支持 Node.js / Python / Go / Rust / Java 五种语言 + monorepo 兼容
- **多 repo 合并探查**：init 时合并多 repo 信息，预览后确认写入
- **`lupine update` 不涉及 ARCHITECTURE.md**：避免覆盖手工维护的内容
- **spec**：新增 [`specs/进场协议自动化.md`](specs/进场协议自动化.md)
- **需求管理**：自研 skill 重命名 `requirements-management` → `lupine-requirements-management`（对齐命名规范）
- **需求管理**：确认 proposal/ 目录已存在，F6 需求管理优化标为 completed
- **Skill 交付**：F5 确认功能完整（skill add/list/remove + 自动安装 + 非推荐探查），标为 completed
- **CI 修复**：release.yml `npm ci` 添加 `working-directory: packages/lupine`，移除不存在的 sync-templates 步骤
- **构建交付（F4 completed）**：
  - `lupine update` 增加 npm registry 版本检查（`checkNpmLatestVersion`）
  - `package.json` 添加 `scripts.test`，创建 smoke tests（8 个测试全通过）
  - `release.yml` 补全：test → npm publish → GitHub Release + templates tarball
  - `specs/构建交付.md` 更新：简化版本管理设计、补全 CI/CD 和双渠道发布细节

## v0.7

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
