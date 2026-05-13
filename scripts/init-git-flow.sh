# init-git-flow.sh — Git Flow 交互模块
# source 加载，不设执行权限
# 入口: init_git_flow

init_git_flow() {
    echo ""
    echo "🐺 Git 分支策略"
    read -p "  是否采用 Lupine 推荐的 Git Flow 分支策略（master/dev/release/feat/fix）？(Y/n) " choice
    case "$choice" in
        [Nn]*)
            cat > "$INIT_DIR/rules/git.md" <<'GITEOF'
# Git 协作规范

（此项目未采用 Lupine 推荐的 Git Flow，请根据团队规范自行补充）
GITEOF
            echo "  已跳过 Git Flow 配置，rules/git.md 已置空"
            ;;
        *)
            echo "  已应用 Git Flow 分支策略"
            ;;
    esac
    return 0
}
