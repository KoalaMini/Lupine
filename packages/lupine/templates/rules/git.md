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

## PR 流程
- PR 必须经人工审核后方可合并
- AI 评估器的审查结果作为参考，不替代人工审核
- 禁止 self-merge

## 多仓库提交工作流

当 `.lupineconfig.json` 中存在 `independentGit: true` 的仓库时（如 `frontend`、`backend`），这些是独立 Git 仓库，与项目根目录的 Git 无关。

### 提交流程

```
1. pwd                    # 确认当前在正确的仓库目录
2. cd <target-repo>       # 进入目标仓库
3. git status             # 查看变更
4. git add -A
5. git commit -m "..."
6. git push
7. cd -                   # 返回 .lupine/ 工作目录
```

### 禁止

- ❌ 在项目根目录对子仓库执行 `git add .` / `git commit`
- ❌ 混淆根目录 Git 和子仓库 Git 的提交

### 建议

- 使用 `git -C <path> <command>` 代替 `cd <path> && git <command>`，避免目录切换
- 示例：`git -C frontend status`、`git -C backend commit -m "..."`
