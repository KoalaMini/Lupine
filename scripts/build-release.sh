#!/bin/bash
set -e

# build-release.sh — 构建 Lupine Release 产物
# 用法: ./scripts/build-release.sh [VERSION]
# 输出: lupine-context-v{VERSION}.tar.gz

VERSION="${1:-$(git describe --tags --always)}"
BUILD_DIR=$(mktemp -d)

echo "🏗️  构建 Lupine Release $VERSION"

# 1. 创建干净的构建目录
mkdir -p "$BUILD_DIR/lupine-context-$VERSION"

# 2. 显式白名单复制（只复制成品需要的文件）
cp -r bin "$BUILD_DIR/lupine-context-$VERSION/"
cp -r assets "$BUILD_DIR/lupine-context-$VERSION/"
cp -r scripts "$BUILD_DIR/lupine-context-$VERSION/"
cp -r skills "$BUILD_DIR/lupine-context-$VERSION/"
cp README.md "$BUILD_DIR/lupine-context-$VERSION/"

# 3. assets/ 下的 README.md 是用户项目的模板文件，保留
#    （根目录的 README.md 已在步骤2复制，与 assets/README.md 共存）

# 4. 生成版本标记
echo "$VERSION" > "$BUILD_DIR/lupine-context-$VERSION/.lupine-version"

# 5. 打包
tar -czf "lupine-context-$VERSION.tar.gz" -C "$BUILD_DIR" "lupine-context-$VERSION"

# 6. 清理
rm -rf "$BUILD_DIR"

echo "✅ 构建完成: lupine-context-$VERSION.tar.gz"
echo "   产物大小: $(du -h "lupine-context-$VERSION.tar.gz" | cut -f1)"
