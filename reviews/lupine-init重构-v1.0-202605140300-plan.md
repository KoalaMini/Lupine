# 评估器①审查报告：lupine-init 重构 plan

- **审查对象**: `plans/20260514-lupine-init重构.md`
- **基于 spec**: `specs/lupine-init重构-v1.0-20260514.md`
- **审查类型**: plan 门禁
- **日期**: 2026-05-14

---

## 审查结果：✅ 通过

---

## 逐项检查

### Spec 覆盖检查

| # | Spec 要求 | Plan 覆盖 | 说明 |
|---|-----------|-----------|------|
| 1 | `scripts/init-check.sh` 防御性检查 | ✅ | `init_check()` 检查 ASSETS_DIR 存在性 |
| 2 | `scripts/init-git-flow.sh` 交互确认 | ✅ | `init_git_flow()` 原封搬运 read+case 逻辑 |
| 3 | `scripts/init-exec.sh` 执行落地 | ✅ | `init_exec()` 含 mkdir、cp、install-skills |
| 4 | 主脚本只做编排 | ✅ | 6 步顺序调用，无混合业务逻辑 |
| 5 | source 方式加载，不设执行权限 | ✅ | 使用 `.` 加载，无 chmod +x |
| 6 | 唯一入口函数 `init_<模块>` | ✅ | init_check / init_git_flow / init_exec |
| 7 | 错误码 return 0/1 | ✅ | 所有函数遵循 |
| 8 | 环境变量通信 | ✅ | LUPINE_FRAMEWORK_DIR / INIT_DIR / ASSETS_DIR |
| 9 | 保持 set -e | ✅ | 主脚本保留 set -e |
| 10 | 双引号包裹路径 | ✅ | 全部路径变量用 `"$VAR"` |
| 11 | 不改动 assets/ 和 install-skills.sh | ✅ | init_exec 只调用不修改 |
| 12 | 不新增 CLI 参数 | ✅ | 保持 `$1` `$2` 两个位置参数 |
| 13 | 不修改 git.md 模板内容 | ✅ | 直接搬运原内容 |
| 14 | 不做 unit test | ✅ | 计划不做 |

### Spec 内部矛盾处理

spec 第 41 行写"接受 LUPINE_FRAMEWORK_DIR 和 INIT_DIR 作为参数"，但第 47-51 行的示例却是无参函数"依赖环境变量"。plan 选择了 **环境变量方案**（更符合 bash 惯例），并在通信契约中明确定义了 3 个环境变量。结论：**合理取舍**。

### 架构门禁

| 标准 | 结果 | 说明 |
|------|------|------|
| 依赖方向正确 | ✅ | 主脚本 → source → 模块函数，模块间无相互依赖 |

### 安全门禁

| 标准 | 结果 | 说明 |
|------|------|------|
| 密码/密钥硬编码 | ✅ 无 | 本重构不涉及 |
| 敏感信息泄露 | ✅ 无 | 本重构不涉及 |

### 质量门禁

| 标准 | 结果 | 说明 |
|------|------|------|
| 测试覆盖率 ≥ 80% | N/A | spec 明确不做 unit test |
| 圈复杂度 ≤ 15 | ✅ | 各函数 1-3 个分支 |
| 不引入 lint error | N/A | bash 脚本无 lint 工具 |

---

## 发现的问题

**发现 1 — 主脚本缺少对 `script` 目录的防护性 source 检查（建议）**

如果 `scripts/init-check.sh` 等文件不存在，`set -e` 会让 bash 报错退出，但错误信息不够友好。建议在 source 前做文件存在检查：

```bash
for mod in init-check init-git-flow init-exec; do
    f="$LUPINE_FRAMEWORK_DIR/scripts/$mod.sh"
    [ -f "$f" ] || { echo "Error: 模块 $mod.sh 未找到" >&2; exit 1; }
    . "$f"
done
```

**严重程度**: 建议（非阻断）

---

## 结论

plan 完全覆盖 spec 需求，架构设计清晰（编排层 + 三个独立模块），通信契约合理。**评估①通过**，可进入执行阶段。
