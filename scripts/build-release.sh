#!/bin/bash
set -e

# build-release.sh — 构建 Lupine Release 产物
# 用法: ./scripts/build-release.sh [VERSION]
# 输出: lupine-v{VERSION}.tar.gz

VERSION="${1:-$(git describe --tags --always)}"
BUILD_DIR=$(mktemp -d)

echo "🏗️  构建 Lupine Release $VERSION"

# 1. 创建干净的构建目录
mkdir -p "$BUILD_DIR/lupine-$VERSION"

# 2. 显式白名单复制（只复制成品需要的文件）
cp -r framework "$BUILD_DIR/lupine-$VERSION/"
cp README.md "$BUILD_DIR/lupine-$VERSION/"
cp Makefile "$BUILD_DIR/lupine-$VERSION/"
cp install.sh "$BUILD_DIR/lupine-$VERSION/"

# 3. 生成版本标记
echo "$VERSION" > "$BUILD_DIR/lupine-$VERSION/.lupine-version"

# 4. 打包
tar -czf "lupine-$VERSION.tar.gz" -C "$BUILD_DIR" "lupine-$VERSION"

# 5. 清理
rm -rf "$BUILD_DIR"

echo "✅ 构建完成: lupine-$VERSION.tar.gz"
echo "   产物大小: $(du -h "lupine-$VERSION.tar.gz" | cut -f1)"
echo ""
echo "使用方式:"
echo "  tar -xzf lupine-$VERSION.tar.gz"
echo "  cd lupine-$VERSION"
echo "  ./framework/init/lupine-init {项目名称} ./my-project --mode embedded（嵌入模式）"
