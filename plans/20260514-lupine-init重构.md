# lupine-init 重构：模块抽离

- **版本**: v1.0
- **日期**: 2026-05-14
- **状态**: 草稿（待确认）

---

## 1. 功能范围

### 做什么

将 `bin/lupine-init` 中的逻辑按单一职责拆分为：

| 新文件 | 职责 |
|--------|------|
| `bin/lupine-init` | 编排入口，只负责参数解析 + 顺序调用各模块 + 打印 next steps |
| `scripts/init-check.sh` | 防御性检查：模板目录存在性、脚本路径完整性等前置条件 |
| `scripts/init-git-flow.sh` | Git Flow 交互式确认，根据用户选择写入 `rules/git.md` |
| `scripts/init-exec.sh` | 执行逻辑：创建目标目录、复制模板文件、安装 skills |

保留在 `bin/lupine-init` 中的简单逻辑：
- 参数解析（`PROJECT_NAME`, `INIT_DIR`）
- 路径解析（`SCRIPT_DIR`, `LUPINE_FRAMEWORK_DIR`, `ASSETS_DIR`）
- Banner 打印
- 完成后的文件树展示 + next steps

### 不做什么

- 不改动 `assets/` 模板目录结构
- 不改动 `scripts/install-skills.sh`（init-exec.sh 仅调用它）
- 不新增命令行选项或改变接口签名
- 不修改 `rules/git.md` 的内容格式
- 不做 unit test（bash 脚本暂不加测试框架）

### 接口约定

每个 `scripts/init-*.sh` 需满足：

1. **source 方式加载**：不设执行权限，以 `source` 或 `.` 方式引入
2. **唯一入口函数**：每个脚本导出一个函数，命名 `init_<模块>`，接受 `LUPINE_FRAMEWORK_DIR` 和 `INIT_DIR` 作为参数
3. **错误码**：失败时 `return 1`，成功 `return 0`
4. **stdout**：仅输出可打印给用户的提示信息（不要输出内部路径等调试信息）
5. **无副作用**：不要写全局变量，依赖通过参数传递

```
# 函数签名示例
init_check()       # 无参数，依赖 LUPINE_FRAMEWORK_DIR 环境变量
init_git_flow()    # 无参数，交互式读用户输入
init_exec()        # 无参数，依赖 INIT_DIR 环境变量
```

环境变量由 `bin/lupine-init` 在调用前设置。

---

## 2. 安全与约束

- 保持 `set -e` 严格模式
- 所有路径必须用双引号包裹，防止空格路径
- 目标目录已存在时，`mkdir -p` 不报错，但 `cp -r` 不应意外覆盖已有文件
  - 初次初始化场景下目标目录为空，覆盖风险低，暂不加保护

---

## 3. 边界情况

| 场景 | 行为 |
|------|------|
| `ASSETS_DIR` 不存在 | `init_check` 报错退出，主脚本不继续 |
| `scripts/` 目录下缺少 `init-*.sh` | `source` 失败 → bash 报错终止（`set -e`） |
| 用户 Ctrl+C 中断 | `set -e` 无特殊处理，自然终止 |
| 目标路径含空格 | 双引号包裹路径，正常处理 |
| 重复初始化已存在的项目 | `mkdir -p` 无影响，`cp -r` 覆盖模板文件（行为同现状） |

---

## 4. 非功能要求

- 无新增外部依赖
- 执行时间与重构前一致（仅函数调用开销）
- 保持 bash 3.2+ 兼容性（macOS 默认）

---

## 5. 目录结构变化

重构后：

```
bin/
  lupine-init          # 编排入口（精简）
scripts/
  install-skills.sh    # 不变
  init-check.sh        # 新增：前置检查
  init-git-flow.sh     # 新增：Git Flow 交互
  init-exec.sh         # 新增：执行逻辑
```

---

## 6. 变更记录

- v1.0: 初始版本
