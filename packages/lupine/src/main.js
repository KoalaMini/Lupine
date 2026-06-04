import { Command } from 'commander';

export function main() {
  const program = new Command();

  program
    .name('lupine')
    .description('Lupine 多 Agent 协作开发框架 — 项目初始化与更新')
    .version(process.env.npm_package_version || '0.0.0');

  program
    .command('init')
    .description('初始化 .lupine/ 工作区')
    .option('-n, --name <name>', '项目名称')
    .option('-p, --platform <platform>', 'AI 平台 (opencode/claude)', 'opencode')
    .option('-r, --repo <paths...>', '代码仓库路径（可多个）')
    .action(async (options) => {
      const { init } = await import('./init.js');
      await init(options);
    });

  program
    .command('update')
    .description('更新 .lupine/ 模板文件')
    .option('-f, --force', '强制覆盖用户修改过的文件')
    .option('--dry-run', '预览模式，不实际写入')
    .action(async (options) => {
      const { update } = await import('./update.js');
      await update(options);
    });

  program.parse(process.argv);

  // 没有匹配子命令时显示帮助
  if (!process.argv.slice(2).length) {
    program.help();
  }
}
