#!/bin/sh
set -e

# Lupine 一键安装脚本
# 用法: curl -fsSL https://raw.githubusercontent.com/koalamini/lupine/master/install.sh | bash
# 环境变量:
#   VERSION=v1.0.0  指定版本（默认最新 release）
#   FORCE=1         强制覆盖已有 .lupine-framework/
#   DRY_RUN=1       仅预览，不写入

OWNER="koalamini"
REPO="lupine"
TARBALL_NAME="lupine-context"
FRAMEWORK_DIR=".lupine-framework"

VERSION="${VERSION:-}"
FORCE="${FORCE:-}"
DRY_RUN="${DRY_RUN:-}"

# ─── 工具函数 ─────────────────────────────────────────

info()  { printf "  %s\n" "$1"; }
ok()    { printf "  ✅ %s\n" "$1"; }
warn()  { printf "  ⚠️  %s\n" "$1" >&2; }
err()   { printf "  ❌ %s\n" "$1" >&2; exit 1; }

# ─── 1. 环境检查 ──────────────────────────────────────

check_env() {
    if ! command -v curl >/dev/null 2>&1; then
        err "curl 未安装，请先安装 curl"
    fi
    if ! command -v python3 >/dev/null 2>&1; then
        err "python3 未安装，lupine-init 依赖 Python 3"
    fi
    if ! python3 -c "import yaml" 2>/dev/null; then
        warn "未安装 PyYAML，正在安装..."
        pip3 install pyyaml || pip install pyyaml || err "PyYAML 安装失败，请手动执行: pip install pyyaml"
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
    if [ -d "$FRAMEWORK_DIR" ] && [ -z "$FORCE" ]; then
        err "检测到已有 $FRAMEWORK_DIR/ 目录\n    如需重新安装，请执行: rm -rf $FRAMEWORK_DIR && curl ... | bash\n    或添加 FORCE=1 环境变量覆盖"
    fi
}

# ─── 5. 解压与安装 ────────────────────────────────────

extract_framework() {
    if [ -n "$DRY_RUN" ]; then
        ok "[DRY_RUN] 将解压到 $FRAMEWORK_DIR/"
        return 0
    fi

    # 解压到临时目录
    EXTRACT_DIR="$TMP_DIR/extract"
    mkdir -p "$EXTRACT_DIR"
    tar -xzf "$TMP_TARBALL" -C "$EXTRACT_DIR"

    # 找到解压后的根目录（lupine-context-vX.X.X/）
    SRC_DIR=$(find "$EXTRACT_DIR" -maxdepth 1 -type d | tail -n 1)

    # 复制到 .lupine-framework/
    rm -rf "$FRAMEWORK_DIR"
    mkdir -p "$FRAMEWORK_DIR"
    cp -r "$SRC_DIR"/* "$FRAMEWORK_DIR/"

    ok "Lupine 框架已安装到 $FRAMEWORK_DIR/"
}

# ─── 6. 清理 ──────────────────────────────────────────

cleanup() {
    if [ -n "$TMP_DIR" ] && [ -d "$TMP_DIR" ]; then
        rm -rf "$TMP_DIR"
    fi
}

# ─── 7. 输出指引 ──────────────────────────────────────

print_guide() {
    version_file="$FRAMEWORK_DIR/.lupine-version"
    installed_version="unknown"
    if [ -f "$version_file" ]; then
        installed_version=$(cat "$version_file")
    fi

    echo ""
    echo "✅ Lupine 框架安装完成"
    echo ""
    echo "版本: $installed_version"
    echo "位置: $(pwd)/$FRAMEWORK_DIR/"
    echo ""
    echo "下一步 —— 初始化你的项目:"
    echo ""
    echo "  # embedded 模式（推荐，Lupine 嵌入项目内部）"
    echo "  $FRAMEWORK_DIR/framework/init/lupine-init 我的项目 ./my-project --mode embedded"
    echo ""
    echo "  # peer 模式（Lupine 与 frontend/ backend/ 平级）"
    echo "  $FRAMEWORK_DIR/framework/init/lupine-init 我的项目 ./my-project --mode peer"
    echo ""
    echo "快速链接:"
    echo "  $FRAMEWORK_DIR/framework/init/lupine-init --help"
    echo "  cat $FRAMEWORK_DIR/README.md"
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
    extract_framework
    cleanup
    print_guide
}

# 注册清理钩子
trap cleanup EXIT

main "$@"
