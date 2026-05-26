# 技术栈与编码规范

## 技术栈
- 语言: Markdown
- 版本管理: Git
- 项目管理: GitHub Issues + PR

## 文件约定
- `specs/` — 需求规格说明书（.md）
- `plans/` — 技术设计方案（.md）
- `reviews/` — 审查报告（.md）

## 命名规范

- 文件夹统一小写：`specs/`, `plans/`, `reviews/`
- 版本号格式：`v{主版本}.{次版本}`，如 `v1.0`、`v1.1`、`v2.0`
  - 主版本：需求范围变更时递增
  - 次版本：同一范围内细节修正时递增
- 时间戳格式：`YYYYMMDDHHmm`（精确到分钟）
  - 来源：spec 的用户确认时间
- 文件命名：
  - specs: `v{主.次}-{功能名称}-{YYYYMMDDHHmm}.md`
  - plans: `{YYYYMMDDHHmm}-{功能名称}.md`
  - reviews: `{功能名称}-v{主.次}-{YYYYMMDDHHmm}-{plan|code}.md`

## 高质量编码原则

### 单一职责
- 一个文件只做一件事：编排层仅编排，执行单元仅执行
- 模块间通过环境变量 + 返回值通信，不跨模块写全局变量

### 调研先行
- 给方案前先查清现有数据格式与规范（如 SKILL.md 的 YAML front matter）
- 优先扩展已有的数据结构，避免另起文件
- 确认接口契约再动手，不凭空假设
