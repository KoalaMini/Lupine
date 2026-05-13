# Git 协作规范

## 分支策略
- `main`: 保护分支，仅通过 PR 合并
- `feat/{feature}`: 从 main 拉出，开发完成后 PR → main
- `fix/{bug}`: 紧急修复分支

## Commit 规范
- 格式: `{type}({scope}): {description}`
- type: feat / fix / docs / refactor / test / chore
- 正文说明改动原因（why），而非内容（what）
- 尾部附 AI 辅助信息：`AI: {model-name}`

## PR 流程
- PR 必须经人工审核后方可合并
- 禁止 self-merge
