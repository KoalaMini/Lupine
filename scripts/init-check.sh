# init-check.sh — 防御性检查模块
# source 加载，不设执行权限
# 入口: init_check

init_check() {
    if [ ! -d "$ASSETS_DIR" ]; then
        echo "Error: 模板目录不存在: $ASSETS_DIR" >&2
        echo "请检查 Lupine 框架是否正确安装。" >&2
        return 1
    fi
    return 0
}
