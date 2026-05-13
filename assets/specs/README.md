# specs/

功能级需求规格说明书（分析器产出）。

## 命名规范

`{功能名称}-v{主.次}-{YYYYMMDDHHMM}.md`

## 标准 Frontmatter

```yaml
---
name: {功能名称}
type: {business|product|tech}
status: {draft|confirmed|superseded}
version: v{主.次}
date: YYYY-MM-DD HH:MM
supersedes: {被取代的 spec 文件名，无则留空}
superseded_by: {取代本 spec 的文件名，无则留空}
---
```

## 状态说明

- `draft`：草稿，迭代中
- `confirmed`：用户已确认，锁定
- `superseded`：已被新 spec 取代，保留用于追溯
