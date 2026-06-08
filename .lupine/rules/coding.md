# 技术栈与编码规范

## 编码质量

- 代码结构符合设计模式，结构合理
- 每个代码文件职责和逻辑保持纯粹
- 每个代码文件行数不得超过 500 行，超过的建议按复杂逻辑抽离出去

## Commit 质量指引

### 核心原则：可回退

每次完成一个可验证的任务节点后 commit。确保每个 commit 是独立可回退的单元——如果出现问题，可以干净地回退到任意一个 commit 而不丢失不相关的改动。

### Commit Message 格式

```
<动词>: <做了什么>（原因：<为什么>）
```

动词参考：`feat` / `fix` / `docs` / `refactor` / `test` / `chore`

### 好示例

```
feat: 新增 lupine init 命令（原因：用户需要一键初始化项目工作区）
fix: 修复 init 模板占位符替换 bug（原因：{project_name} 未正确渲染）
refactor: 抽取 checksum 模块（原因：generate.js 体积超 500 行）
docs: 新增 CHANGELOG.md（原因：统一版本变更管理）
test: 增加 init 命令集成测试（原因：覆盖用户项目初始化场景）
```

### 不好示例

```
fix bug              ← 没说什么 bug
update               ← 没说什么、为什么
wip                  ← 不可回退
refactor stuff       ← 没说改了哪、为什么改
```

### 回退检查清单

commit 前问自己一句：

> **"如果 3 小时后回退到这个 commit，能知道当时在干什么吗？"**

如果不能，说明 message 不够明确，需要补充上下文。
