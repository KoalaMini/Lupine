# 修复 sync-skills.sh 同步缺陷

## 问题

评估器发现 `sync-skills.sh` 仅通过版本号比较判断是否同步，但所有 skill 版本号均为 `1.0`，导致内容更新后不会被同步到 `~/.claude/skills/`。

## 修复内容

### 1. sync-skills.sh — 增加内容哈希兜底比对

- 新增 `read_skill_hash()` 函数，跨平台支持 `md5sum` / `md5` / `openssl md5`
- 同步判断逻辑增加第三条分支：版本号相同但内容哈希不同时，也触发同步
- 保留原有版本号比较逻辑作为显性语义标记

### 2. 所有 Skill 版本号递增

| Skill | 旧版本 | 新版本 |
|-------|--------|--------|
| lupine-analyzer | 1.0 | 1.1 |
| lupine-planner | 1.0 | 1.1 |
| lupine-evaluator | 1.0 | 1.1 |
| lupine-executor | 1.0 | 1.1 |

### 3. 新增测试脚本

`scripts/test-sync-skills.sh` 覆盖 5 个场景：

1. 首次安装（目标无版本）→ 同步
2. 版本号升级（1.0 → 1.1）→ 同步
3. 版本号相同但内容不同 → 同步
4. 版本号和内容均相同 → 跳过
5. 已安装版本更高 → 跳过（哈希兜底不触发）

## 验证结果

- `./scripts/test-sync-skills.sh`：5/5 通过
- `./scripts/sync-skills.sh`（首次）：检测到版本更新 1.0 → 1.1，成功安装
- `./scripts/sync-skills.sh`（再次）：Skills 已是最新 (1.1)，跳过安装
