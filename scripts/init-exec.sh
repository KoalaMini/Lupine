# init-exec.sh — 执行落地模块
# source 加载，不设执行权限
# 入口: init_exec

init_exec() {
    mkdir -p "$INIT_DIR"
    cp -r "$ASSETS_DIR/"* "$INIT_DIR/"

    if [ -f "$LUPINE_FRAMEWORK_DIR/scripts/sync-skills.sh" ]; then
        "$LUPINE_FRAMEWORK_DIR/scripts/sync-skills.sh"
    fi
    return 0
}
