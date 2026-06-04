# Git 协作规范

## 分支策略
- `master`: 保护分支，仅接受 release 的 PR；合入后打 tag 发布
- `dev`: 日常开发集成分支
- `release`: 从 dev 拉出，测试完成后 PR → master
- `feat/{功能名}`: 从 dev 拉出，开发完成后 PR → dev（功能名优先使用中文）
- `fix/{修复名}`: 从 dev 拉出，修复完成后 PR → dev（修复名优先使用中文）

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
