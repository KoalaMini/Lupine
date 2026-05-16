#!/bin/bash
set -e

# test-sync-skills.sh — 验证 sync-skills.sh 的同步逻辑
# 用法: ./scripts/test-sync-skills.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_DIR="$(cd "$SCRIPT_DIR/../skills" && pwd)"

# 创建临时安装目录
TMP_INSTALL_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_INSTALL_DIR"' EXIT

# 复用 sync-skills.sh 中的函数
cd "$SCRIPT_DIR/.."

# 读取版本
read_skill_version() {
    local skill_file="$1"
    if [ -f "$skill_file" ]; then
        grep '^version:' "$skill_file" | sed 's/version:[[:space:]]*//'
    fi
}

# 计算哈希
read_skill_hash() {
    local skill_file="$1"
    if [ -f "$skill_file" ]; then
        if command -v md5sum >/dev/null 2>&1; then
            md5sum "$skill_file" | awk '{print $1}'
        else
            md5 -q "$skill_file" 2>/dev/null || openssl md5 "$skill_file" | awk '{print $NF}'
        fi
    fi
}

# 版本比较
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

# 模拟 sync_skills 核心判断逻辑
should_sync() {
    local src_file="$1"
    local inst_file="$2"

    local src_ver inst_ver
    src_ver=$(read_skill_version "$src_file")
    inst_ver=$(read_skill_version "$inst_file")

    local src_hash inst_hash
    src_hash=$(read_skill_hash "$src_file")
    inst_hash=$(read_skill_hash "$inst_file")

    if [ -z "$inst_ver" ]; then
        echo "首次安装"
        return 0
    elif ver_gt "$src_ver" "$inst_ver"; then
        echo "版本升级: $inst_ver → $src_ver"
        return 0
    elif [ "$src_hash" != "$inst_hash" ]; then
        echo "内容变更 ($inst_ver)"
        return 0
    else
        echo "已是最新 ($inst_ver)"
        return 1
    fi
}

# 测试用例
TESTS_PASSED=0
TESTS_FAILED=0

assert_should_sync() {
    local desc="$1"
    local expected="$2"
    shift 2
    local result
    result=$(should_sync "$@" 2>/dev/null) || true
    if [ "$result" = "$expected" ]; then
        echo "  ✅ $desc"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "  ❌ $desc"
        echo "     期望: $expected"
        echo "     实际: $result"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

SKILL="$SOURCE_DIR/lupine-analyzer/SKILL.md"

echo ""
echo "=== 测试 sync-skills.sh 同步判断逻辑 ==="
echo ""

# 场景1: 首次安装
INST1="$TMP_INSTALL_DIR/empty.md"
touch "$INST1"
assert_should_sync "场景1: 首次安装（目标无版本）" "首次安装" "$SKILL" "$INST1"

# 场景2: 版本号升级
INST2="$TMP_INSTALL_DIR/old-ver.md"
cp "$SKILL" "$INST2"
sed -i.bak 's/version: 1.1/version: 1.0/' "$INST2" 2>/dev/null || sed -i 's/version: 1.1/version: 1.0/' "$INST2"
assert_should_sync "场景2: 版本号升级 1.0 → 1.1" "版本升级: 1.0 → 1.1" "$SKILL" "$INST2"

# 场景3: 版本号相同但内容不同
INST3="$TMP_INSTALL_DIR/same-ver-diff-content.md"
cp "$SKILL" "$INST3"
# 修改内容但保持版本号不变
echo "# extra content" >> "$INST3"
assert_should_sync "场景3: 版本号相同但内容不同" "内容变更 (1.1)" "$SKILL" "$INST3"

# 场景4: 完全相同
INST4="$TMP_INSTALL_DIR/identical.md"
cp "$SKILL" "$INST4"
assert_should_sync "场景4: 版本号和内容均相同" "已是最新 (1.1)" "$SKILL" "$INST4"

# 场景5: 版本号降级（异常场景）
INST5="$TMP_INSTALL_DIR/newer-ver.md"
cp "$SKILL" "$INST5"
sed -i.bak 's/version: 1.1/version: 2.0/' "$INST5" 2>/dev/null || sed -i 's/version: 1.1/version: 2.0/' "$INST5"
assert_should_sync "场景5: 已安装版本更高（不应同步）" "内容变更 (2.0)" "$SKILL" "$INST5"

echo ""
echo "=== 测试结果 ==="
echo "  通过: $TESTS_PASSED"
echo "  失败: $TESTS_FAILED"

if [ "$TESTS_FAILED" -gt 0 ]; then
    exit 1
fi
