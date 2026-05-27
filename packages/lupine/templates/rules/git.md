# Git 协作规范

## 分支策略

- `main` — 稳定的主分支，仅通过 PR 合并
- `feature/*` — 功能开发分支
- `fix/*` — Bug 修复分支
- `release/*` — 发布准备分支

## Commit 规范

```
<type>(<scope>): <description>

类型: feat / fix / docs / refactor / test / chore
```

## PR 规范

- PR 标题清晰描述变更内容
- PR 描述关联对应的 specs 或 plans
- 必须经评估器审查 + 人工审核后方可合并
- 禁止 self-merge
