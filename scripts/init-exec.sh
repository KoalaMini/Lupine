# init-exec.sh — 执行落地模块
# source 加载，不设执行权限
# 入口: init_exec

init_exec() {
    mkdir -p "$INIT_DIR"

    # 复制模板文件（包含隐藏文件如 .gitignore）
    find "$ASSETS_DIR" -mindepth 1 -maxdepth 1 -exec cp -r {} "$INIT_DIR/" \;

    # 创建 Lupine 工作目录
    mkdir -p "$INIT_DIR/.lupine/sketches"

    if [ -f "$LUPINE_FRAMEWORK_DIR/scripts/sync-skills.sh" ]; then
        "$LUPINE_FRAMEWORK_DIR/scripts/sync-skills.sh"
    fi
    return 0
}
