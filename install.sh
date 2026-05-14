#!/bin/sh
set -e

# Lupine 远程一键安装脚本
# 用法: curl -fsSL https://raw.githubusercontent.com/koalamini/lupine/master/install.sh | bash
# 环境变量:
#   VERSION=v1.0.0  指定版本（默认最新 release）
#   FORCE=1         强制覆盖已有文件
#   DRY_RUN=1       仅预览，不写入

OWNER="koalamini"
REPO="lupine"
TARBALL_NAME="lupine-context"

VERSION="${VERSION:-}"
FORCE="${FORCE:-}"
DRY_RUN="${DRY_RUN:-}"

# ─── 工具函数 ─────────────────────────────────────────

info() { printf "  %s\n" "$1"; }
ok()   { printf "  ✅ %s\n" "$1"; }
warn() { printf "  ⚠️  %s\n" "$1" >&2; }
err()  { printf "  ❌ %s\n" "$1" >&2; exit 1; }

# ─── 1. 环境检查 ──────────────────────────────────────

check_env() {
    if ! command -v curl >/dev/null 2>&1; then
        err "curl 未安装，请先安装 curl"
    fi

    if [ ! -w "." ]; then
        err "当前目录不可写，请切换到可写目录后重试"
    fi
}

# ─── 2. 版本解析 ──────────────────────────────────────

resolve_version() {
    if [ -n "$VERSION" ]; then
        info "使用指定版本: $VERSION"
        return 0
    fi

    info "查询最新版本..."

    # 尝试 GitHub API
    api_url="https://api.github.com/repos/$OWNER/$REPO/releases/latest"
    resolved=$(curl -fsSL --retry 3 --retry-delay 2 \
        -H "Accept: application/vnd.github.v3+json" \
        "$api_url" 2>/dev/null | sed -n 's/.*"tag_name": "\([^"]*\)".*/\1/p' | head -n 1)

    if [ -n "$resolved" ]; then
        VERSION="$resolved"
        ok "最新版本: $VERSION"
        return 0
    fi

    # API 限流降级：尝试 latest release 固定 URL
    warn "GitHub API 限流，尝试直接下载 latest release..."
    VERSION="latest"
}

# ─── 3. 下载 tarball ──────────────────────────────────

download_tarball() {
    if [ "$VERSION" = "latest" ]; then
        url="https://github.com/$OWNER/$REPO/releases/latest/download/${TARBALL_NAME}.tar.gz"
    else
        url="https://github.com/$OWNER/$REPO/releases/download/${VERSION}/${TARBALL_NAME}-${VERSION}.tar.gz"
    fi

    TMP_DIR=$(mktemp -d)
    TMP_TARBALL="$TMP_DIR/${TARBALL_NAME}.tar.gz"

    info "下载: $url"

    if [ -n "$DRY_RUN" ]; then
        ok "[DRY_RUN] 将下载: $url"
        return 0
    fi

    if ! curl -fsSL --retry 3 --retry-delay 2 -o "$TMP_TARBALL" "$url"; then
        rm -rf "$TMP_DIR"
        err "下载失败，请检查网络或手动指定 VERSION"
    fi

    ok "下载完成"
}

# ─── 4. 冲突检测 ──────────────────────────────────────

check_conflicts() {
    conflicts=""
    for file in "rules/agents.md" "rules/evals.md" "CLAUDE.md"; do
        if [ -f "$file" ]; then
            conflicts="$conflicts $file"
        fi
    done

    if [ -n "$conflicts" ] && [ -z "$FORCE" ]; then
        err "检测到已有 Lupine 文件:$conflicts\n    如需覆盖，请重新执行并添加 FORCE=1"
    fi
}

# ─── 5. 解压与嵌入 ────────────────────────────────────

extract_and_install() {
    if [ -n "$DRY_RUN" ]; then
        ok "[DRY_RUN] 将解压 assets 到当前目录"
        return 0
    fi

    # 解压到临时目录
    EXTRACT_DIR="$TMP_DIR/extract"
    mkdir -p "$EXTRACT_DIR"
    tar -xzf "$TMP_TARBALL" -C "$EXTRACT_DIR"

    # 找到解压后的根目录（lupine-context-vX.X.X/）
    SRC_DIR=$(find "$EXTRACT_DIR" -maxdepth 1 -type d | tail -n 1)

    # 只复制 assets/ 下的上下文文件到当前目录
    if [ -d "$SRC_DIR/assets" ]; then
        cp -r "$SRC_DIR/assets"/* .
    fi

    # 复制版本标记文件
    if [ -f "$SRC_DIR/.lupine-version" ]; then
        cp "$SRC_DIR/.lupine-version" .
    fi

    ok "Lupine 上下文已嵌入当前目录"
}

# ─── 6. 占位符替换 ────────────────────────────────────

replace_placeholders() {
    if [ -n "$DRY_RUN" ]; then
        ok "[DRY_RUN] 将替换 CLAUDE.md 中的占位符"
        return 0
    fi

    project_name=$(basename "$(pwd)")

    if [ -f "CLAUDE.md" ]; then
        sed -i.bak "s|{项目名称}|$project_name|g" "CLAUDE.md" 2>/dev/null || \
        sed -i "s|{项目名称}|$project_name|g" "CLAUDE.md" 2>/dev/null || \
        warn "占位符替换失败，请手动编辑 CLAUDE.md"
        rm -f "CLAUDE.md.bak" 2>/dev/null || true
    fi

    ok "已填入项目名: $project_name"
}

# ─── 7. 清理 ──────────────────────────────────────────

cleanup() {
    if [ -n "$TMP_DIR" ] && [ -d "$TMP_DIR" ]; then
        rm -rf "$TMP_DIR"
    fi
}

# ─── 8. 输出指引 ──────────────────────────────────────

print_guide() {
    version_file=".lupine-version"
    installed_version="unknown"
    if [ -f "$version_file" ]; then
        installed_version=$(cat "$version_file")
    fi

    echo ""
    echo "✅ Lupine 上下文已嵌入到当前项目"
    echo ""
    echo "版本: $installed_version"
    echo "位置: $(pwd)"
    echo ""
    echo "已创建文件:"
    echo "  CLAUDE.md          ← AI 入口"
    echo "  README.md          ← 项目介绍模板"
    echo "  rules/"
    echo "    agents.md        ← 四角色定义"
    echo "    evals.md         ← 评估门禁标准"
    echo "    coding.md        ← 编码规范（请根据项目技术栈编辑）"
    echo "    git.md           ← Git 协作规范"
    echo "  specs/             ← 空目录，用于存放需求规格"
    echo "  plans/             ← 空目录，用于存放技术设计"
    echo "  reviews/           ← 空目录，用于存放审查报告"
    echo "  tasks/             ← 空目录，用于任务跟踪"
    echo ""
    echo "下一步:"
    echo "  1. 编辑 rules/coding.md，填入你的技术栈和团队约定"
    echo "  2. 编辑 README.md，补充项目介绍"
    echo "  3. 在项目目录启动 Claude Code，AI 将读取 CLAUDE.md 进入 Lupine 工作流"
    echo ""
    echo "使用快捷指令切换角色:"
    echo "  /lupine-analyzer   分析需求"
    echo "  /lupine-planner    技术设计"
    echo "  /lupine-executor   编写代码"
    echo "  /lupine-evaluator  审查评估"
    echo ""
}

# ─── 主流程 ───────────────────────────────────────────

main() {
    echo "🐺 Lupine 一键安装"
    echo ""

    check_env
    resolve_version
    check_conflicts
    download_tarball
    extract_and_install
    replace_placeholders
    cleanup
    print_guide
}

# 注册清理钩子
trap cleanup EXIT

main "$@"
