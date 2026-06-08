---
name: lupine-git-workflow
version: 1.1.0
description: Lupine 项目的 Git 分支与提交规范。当 AI 需要执行 git commit、创建分支、发起 PR 或任何版本控制操作时，必须加载此技能。它规定了 AI 的分支选择逻辑、禁入 master 的约束、commit 格式和 PR 提交流程。涉及 git 操作的场景（"提交代码""开个 PR""合并分支""push""commit"等）都应触发。
---

# Lupine Git 工作流技能

本技能定义 AI 在 Lupine 项目中的 Git 操作规范。核心原则：

> **AI 写代码、开 PR，用户做合并。AI 永不触碰 master。**

## 分支决策树

当收到需求或需要代码变更时，按以下规则选择分支：

```
需求/变更
  ├── 产生 specs/ 产出（新功能、大改动、需产品讨论）
  │   └── → feat/{功能名}
  │        （从 dev 拉出，完成后 PR → dev）
  │
  ├── 小优化、重构、文档、配置变更
  │   └── → 直接 commit 到 dev
  │
  ├── Bug 修复（非紧急）
  │   └── → 直接 commit 到 dev
  │
  └── 紧急线上 bug（线上故障需立即修复）
      └── → hotfix/{修复名}
           （从 master 拉出，完成后 PR → master）
           ※ 需要用户确认并手动合并
```

### 分支命名规则

- `feat/{功能名}` — 功能名优先使用中文，kebab-case，如 `feat/用户认证`
- `hotfix/{修复名}` — 修复名使用中文，kebab-case，如 `hotfix/登录崩溃`
- 分支名简短达意，不超过 30 个字符

## AI Git 操作铁律

### 1. 禁止 commit 到 master

AI **绝不允许**直接或间接向 `master` 分支写入代码。

每次 `git commit` / `git push` 前必须执行分支确认：

```bash
# 确认当前分支
git branch --show-current

# 或者用 pwd 确认所在目录，然后用 git 查看
pwd && git branch --show-current
```

| 当前分支 | AI 能否 commit | 说明 |
|----------|---------------|------|
| `master` | ❌ 禁止 | 立即中止操作，告知用户无法在 master 上提交 |
| `dev` | ✅ 允许 | 仅限小优化、bug fix、文档等非 spec 产出场景 |
| `feat/*` | ✅ 允许 | 功能开发分支 |
| `hotfix/*` | ✅ 允许 | 紧急修复分支，但 PR → master 需用户合并 |

如果发现当前在 `master` 上，AI 必须：
1. 中止 commit/push 操作
2. 告知用户："当前在 master 分支上，AI 不允许直接向 master 提交代码。请切到 dev 或其他特性分支后再执行变更。"

### 2. 分支切换规则

- 创建特性分支时，**必须从 `dev` 拉出**（而非当前分支）
- 切分支前，确认当前工作区干净（无未提交变更）

```bash
# 正确做法
git checkout dev
git pull origin dev
git checkout -b feat/用户认证
```

### 3. AI 无合并权限

AI **不允许**执行任何合并操作（merge / rebase 等合并行为）：

- `git merge` → ❌ 禁止
- `git rebase` → ❌ 禁止（除非用户明确要求）
- PR 审批 → ❌ 禁止（AI 不能审批自己的 PR）
- PR 合并 → ❌ 禁止

AI 的权限止于：
1. 在对应分支上写代码、commit、push
2. 创建 Pull Request
3. 在 PR 描述中注明"此 PR 由 AI 创建，请人工审核后合并"
4. **不点 Merge 按钮，不执行 `gh pr merge`**

### 4. Commit 质量指引

#### 核心原则：可回退

每次完成一个可验证的任务节点后 commit。确保每个 commit 是独立可回退的单元——如果出现问题，可以干净地回退到任意一个 commit 而不丢失不相关的改动。

#### Commit Message 格式

```
<动词>: <做了什么>（原因：<为什么>）
```

动词参考：`feat` / `fix` / `docs` / `refactor` / `test` / `chore`

#### 好示例

```
feat: 新增 lupine init 命令（原因：用户需要一键初始化项目工作区）
fix: 修复 init 模板占位符替换 bug（原因：{project_name} 未正确渲染）
refactor: 抽取 checksum 模块（原因：generate.js 体积超 500 行）
docs: 新增 CHANGELOG.md（原因：统一版本变更管理）
test: 增加 init 命令集成测试（原因：覆盖用户项目初始化场景）
```

#### 不好示例

```
fix bug              ← 没说什么 bug
update               ← 没说什么、为什么
wip                  ← 不可回退
refactor stuff       ← 没说改了哪、为什么改
```

#### 回退检查清单

commit 前问自己一句：

> **"如果 3 小时后回退到这个 commit，能知道当时在干什么吗？"**

如果不能，说明 message 不够明确，需要补充上下文。

## PR 提交流程

当 AI 完成分支开发后，创建 PR 的流程：

1. **确保分支已 push**：`git push origin feat/xxx`
2. **创建 PR**：使用 `gh` CLI 或通过 git 平台 API
3. **PR 标题**：用中文描述变更内容
4. **PR 描述**：包含：
   - 变更摘要
   - 关联的 spec/plan 链接（如有）
   - `🤖 此 PR 由 AI 自动创建，请人工审核后合并。AI 不应执行合并操作。`
5. **不合并**：创建完 PR 后，告知用户 PR 链接，请用户自行合并

```bash
# 正确做法
gh pr create \
  --title "feat: 用户认证模块" \
  --body "实现了 JWT 登录/注册/刷新。
关联 spec: specs/用户认证.md
🤖 此 PR 由 AI 自动创建，请人工审核后合并。AI 不应执行合并操作。" \
  --base dev
```

## 多仓库 Git 操作指引

如果项目是 Lupine 的多仓库架构（`.lupineconfig.json` 的 `repositories` 中有 `independentGit: true` 的仓库，如 `frontend`、`backend`），每个子仓库独立遵循本规范。

**提交代码时必须先进入该仓库目录**，禁止从项目根目录直接操作这些仓库的 git：

```bash
cd frontend          # 或 git -C frontend <command>
git add -A
git commit -m "..."
cd -                 # 返回工作目录
```

**每次 `git commit` 前必须 `pwd` 确认所在目录和当前分支正确**：

```bash
pwd && git branch --show-current
```

关键点：
- 这些仓库的 `.git` 在各自目录内，不在项目根目录
- 从根目录执行 `git add` 会操作根仓库而非子仓库的代码
- `git -C <仓库目录> <command>` 是免 cd 的等效写法，适合单条命令

## 基本原理

这些约束存在的原因：

- **master 保护**：master 是发布分支，AI 的误操作可能导致生产事故。所有 master 变更必须经过人工审查。
- **分支策略**：feat 分支隔离了复杂功能开发，避免半成品污染 dev；dev 作为集成分支可以包容小步快跑。
- **人工合并**：合并是代码审查的最后一道门。AI 可以辅助开发，但代码上线的责任在人类。
