# Git 协作规范

## 分支策略
- `main`: 保护分支，仅通过 PR 合并
- `feat/{feature}`: 从 main 拉出，开发完成后 PR → main
- `fix/{bug}`: 紧急修复分支

## Commit 规范（Linux 社区风格）
- 格式: `{type}({scope}): {description}`
- type: feat / fix / docs / refactor / test / chore
- scope: 模块名，如 auth / user / db
- 正文说明改动原因（why），而非内容（what）
- 尾部附 AI 辅助信息：

  ```
  AI: {model-name}
  ```

- 示例:

  ```
  feat(auth): add JWT refresh token rotation

  原 refresh token 永不过期，改为轮换机制：
  每次刷新颁发新 refresh token，旧 token 作废。

  AI: kimi-k2.6
  ```

## PR 流程
- PR 必须经人工审核后方可合并
- AI 评估器的审查结果作为参考，不替代人工审核
- 禁止 self-merge
