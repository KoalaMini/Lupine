# Git 协作规范

## 分支策略
- `master`: 保护分支，仅接受 release 的 PR；合入后打 tag 发布
- `dev`: 日常开发集成分支
- `release`: 从 dev 拉出，测试完成后 PR → master
- `feat/{功能名}`: 从 dev 拉出，开发完成后 PR → dev（功能名优先使用中文）
- `fix/{修复名}`: 从 dev 拉出，修复完成后 PR → dev（修复名优先使用中文）

## Commit 规范
- 格式: `{type}({scope}): {description}`
- type: feat / fix / docs / refactor / test / chore
- 正文说明改动原因（why），而非内容（what）
- 尾部附 AI 辅助信息：`AI: {model-name}`

## PR 流程
- PR 必须经人工审核后方可合并
- 禁止 self-merge
