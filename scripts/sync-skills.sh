#!/bin/bash
set -e

# sync-skills.sh — 版本感知的 Lupine Skills 同步
# 从 SKILL.md YAML front matter 读取版本号，
# 仅当源码版本 > 已安装版本时执行安装。
# 用法: ./scripts/sync-skills.sh
# 也可 source 加载: source sync-skills.sh → sync_skills

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LUPINE_FRAMEWORK_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_DIR="$LUPINE_FRAMEWORK_DIR/skills"
INSTALL_DIR="$HOME/.claude/skills"

CANONICAL_SKILL="lupine-analyzer/SKILL.md"

# 从 YAML front matter 提取 version 字段
read_skill_version() {
    local skill_file="$1"
    if [ -f "$skill_file" ]; then
        grep '^version:' "$skill_file" | sed 's/version:[[:space:]]*//'
    fi
}

# 版本比较：若 v1 > v2 返回 0，否则返回 1
ver_gt() {
    local v1="${1#v}" v2="${2#v}"
    local IFS=.
    set -- $v1
    local a1=$1 a2=$2 a3=$3
    set -- $v2
    local b1=$1 b2=$2 b3=$3
    { [ "${a1:-0}" -gt "${b1:-0}" ] 2>/dev/null && return 0; }
    { [ "${a1:-0}" -lt "${b1:-0}" ] 2>/dev/null && return 1; }
    { [ "${a2:-0}" -gt "${b2:-0}" ] 2>/dev/null && return 0; }
    { [ "${a2:-0}" -lt "${b2:-0}" ] 2>/dev/null && return 1; }
    { [ "${a3:-0}" -gt "${b3:-0}" ] 2>/dev/null && return 0; }
    return 1
}

sync_skills() {
    local src_ver inst_ver
    src_ver=$(read_skill_version "$SOURCE_DIR/$CANONICAL_SKILL")
    inst_ver=$(read_skill_version "$INSTALL_DIR/$CANONICAL_SKILL")

    if [ -z "$src_ver" ]; then
        echo "Warning: 源码 SKILL.md 未定义版本号" >&2
    fi

    if [ -z "$inst_ver" ]; then
        echo "检测到首次安装或版本信息缺失，开始同步..."
    elif ver_gt "$src_ver" "$inst_ver"; then
        echo "检测到 Skills 更新: $inst_ver → $src_ver"
    else
        echo "Skills 已是最新 ($inst_ver)，跳过安装"
        return 0
    fi

    if [ -f "$LUPINE_FRAMEWORK_DIR/scripts/install-skills.sh" ]; then
        "$LUPINE_FRAMEWORK_DIR/scripts/install-skills.sh"
    else
        echo "Error: install-skills.sh 未找到" >&2
        return 1
    fi

    return 0
}

# 直接执行或 source 后调用 sync_skills
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    sync_skills
fi
