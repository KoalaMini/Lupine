> ⚠️ **已废弃（Deprecated）**
>
> 自 v0.3（2026-05-26）起，不再维护独立的 Release 测试规范。
> 测试职责由评估器（Evaluator）按照 `rules/constraints.yaml` 中的约束执行。
> 本文件保留作为历史参考，不再更新。

---

# Release 分支测试规范

> 本文档定义 `release` 分支（`git.md`）在合入 `master` 前必须完成的测试项与通过标准。

## 目标

`release` 分支是发布前的最后一道质量关卡。所有变更已冻结，仅允许修复阻塞性缺陷。

## 测试分层

### 第一层：门禁检查（阻断性）

执行方：Executor（本地）+ Evaluator（审查）

| 检查项 | 来源 | 通过标准 |
|--------|------|----------|
| 新增代码测试覆盖率 | `evals.md` 质量门禁 | ≥ 80% |
| 圈复杂度 | `evals.md` 质量门禁 | ≤ 15 |
| 无新增 lint error | `evals.md` 质量门禁 | 0 |
| 密码/token 硬编码 | `evals.md` 安全门禁 | 0 处 |
| 敏感信息泄露 | `evals.md` 安全门禁 | 日志/响应中无敏感信息 |

### 第二层：冒烟测试（阻断性）

执行方：Executor（本地）+ 人工验证

| 检查项 | 来源 | 通过标准 |
|--------|------|----------|
| 常规路径 | `evals.md` 冒烟覆盖 | 核心功能主流程通过 |
| 分支/异常路径 | `evals.md` 冒烟覆盖 | 所有交互选项、边界条件通过 |
| 错误路径 | `evals.md` 冒烟覆盖 | 文件缺失、权限不足等降级行为符合预期 |

### 第三层：回归与影响确认（警告性）

执行方：Evaluator（审查）+ 人工确认

| 检查项 | 来源 | 通过标准 |
|--------|------|----------|
| 架构合规 | `evals.md` 架构门禁 | handler 无业务逻辑、service 无 HTTP 细节 |
| 依赖方向 | `evals.md` 架构门禁 | 无逆向依赖 |
| 多源一致性 | `evals.md` 评估①扩展 | 规范文档间表述无冲突 |
| 既有功能回归 | — | 本次变更未破坏已有功能 |

## 无 CI/CD 时的执行方式

1. **本地执行**：Executor 在本地运行全部测试脚本，输出测试报告
2. **人工审查**：Evaluator 对照本规范逐项确认，产出 `reviews/` 下的审查报告
3. **缺陷修复**：阻塞性问题在 `release` 分支直接修复，修复后重新执行对应层级
4. **合并前置条件**：三层全部通过后，方可发起 `release → master` 的 PR

## 操作命令模板

> 以下命令为占位符模板，按实际技术栈替换后使用。

```bash
# 1. 门禁检查
coverage run -m pytest && coverage report --fail-under=80
radon cc . --average --max-cc=15
lint .
grep -rn "password\|token\|secret\|key" --include="*.py" | grep -v "test_"

# 2. 冒烟测试
pytest tests/smoke/
pytest tests/integration/

# 3. 回归测试
pytest tests/regression/
```

如无自动化测试框架，使用以下人工 checklist 替代：

```markdown
- [ ] 常规路径：____（填写验证步骤）
- [ ] 异常路径：____
- [ ] 错误路径：____
- [ ] 既有功能回归：____
```

## 与 Git 流程的衔接

- `release` 分支从 `dev` 拉出后，禁止再从 `dev` 合并新功能
- 仅允许缺陷修复提交进入 `release`
- PR 至 `master` 时，审查报告需作为 PR 描述附件或引用

## 合规扩展（预留）

若项目后续需满足等保、SOC2 等合规要求，在本层基础上增加：
- 安全渗透测试
- 审计日志完整性验证
- 数据脱敏检查
