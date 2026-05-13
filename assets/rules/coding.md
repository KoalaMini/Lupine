# 技术栈与编码规范

## 技术栈
- 语言/框架/数据库/基础设施
- 关键依赖版本

## 文件约定
- `specs/` — 需求规格说明书
- `plans/` — 技术设计方案
- `reviews/` — 审查报告
- `tasks/` — 任务跟踪

## 命名规范

- 文件夹统一小写：`specs/`, `plans/`, `reviews/`, `tasks/`
- 版本号格式：`v{主版本}.{次版本}`，如 `v1.0`、`v1.1`、`v2.0`
  - 主版本：需求范围变更时递增
  - 次版本：同一范围内细节修正时递增
- 时间戳格式：`YYYYMMDDHHMM`（精确到分钟）
  - 来源：spec 的用户确认时间
- 文件命名：
  - specs: `{功能名称}-v{主.次}-{YYYYMMDDHHMM}.md`
  - plans: `{YYYYMMDDHHMM}-{功能名称}.md`
  - reviews: `{功能名称}-v{主.次}-{YYYYMMDDHHMM}-{plan|code}.md`
  - tasks: `{YYYYMMDDHHMM}-{功能名称}.md`
