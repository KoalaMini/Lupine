#!/bin/bash
set -e

# install-skills.sh — 将 Lupine Agent Skills 安装到 Claude Code 全局目录
# 用法: ./scripts/install-skills.sh

SKILLS_DIR="$HOME/.claude/skills"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/skills"

echo "🐺 Lupine Skills 安装"
echo "   来源: $SOURCE_DIR"
echo "   目标: $SKILLS_DIR"
echo ""

# 创建目标目录
mkdir -p "$SKILLS_DIR"

# 安装 skill 目录
INSTALLED=0
for skill in lupine-analyzer lupine-planner lupine-evaluator lupine-executor; do
  src="$SOURCE_DIR/$skill"
  dst="$SKILLS_DIR/$skill"

  if [ -d "$src" ] && [ -f "$src/SKILL.md" ]; then
    rm -rf "$dst"
    cp -R "$src" "$dst"
    echo "  ✅ $skill"
    INSTALLED=$((INSTALLED + 1))
  else
    echo "  ❌ $skill/SKILL.md 未找到 ($src)"
    exit 1
  fi
done

echo ""
echo "安装完成 ($INSTALLED/4)。可用快捷指令："
echo "  /lupine-analyzer  — 启动分析器"
echo "  /lupine-planner   — 启动规划器"
echo "  /lupine-evaluator — 启动评估器"
echo "  /lupine-executor  — 启动执行器"
