# Lupine — 多 Agent 协作开发流水线
#
# 使用方式:
#   make help             显示帮助
#   make init             初始化新项目（需传 NAME）

init:
	@echo "🐺 Lupine 项目初始化"
	@echo ""
	@if [ -z "$(NAME)" ]; then \
		echo "用法: make init NAME=项目名"; \
		echo "示例: make init NAME=my-app"; \
		exit 1; \
	fi
	./bin/lupine-init "$(NAME)" --mode embedded

help:
	@echo "🐺 Lupine — 多 Agent 协作开发流水线"
	@echo ""
	@echo "目标:"
	@echo "  make init NAME=<project>  初始化新项目"
	@echo "  make help                 显示本帮助"
	@echo ""
	@echo "快速入门:"
	@echo "  make init NAME=my-app"
	@echo "  cd my-app && opencode"
	@echo ""
