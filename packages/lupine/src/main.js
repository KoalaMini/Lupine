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
    .option('--sync-skills', '同时更新所有 builtin 和推荐外部 Skill')
    .action(async (options) => {
      const { update } = await import('./update.js');
      await update(options);
    });

  // ── skill 命令组 ──
  const skill = program.command('skill').description('Skill 管理');

  skill
    .command('add <source>')
    .description('安装 Skill')
    .option('-s, --skill <name>', '指定 Skill 名称（多 Skill 仓库时使用）')
    .option('-p, --platform <name>', 'AI 平台 (opencode/claude)')
    .option('--dry-run', '预览模式，不实际写入')
    .option('--force', '强制覆盖已有安装')
    .action(async (source, options) => {
      const { addSkill } = await import('./skills.js');
      await addSkill(source, options);
    });

  skill
    .command('list')
    .description('查看已安装和推荐的 Skill')
    .action(async () => {
      const { listSkills } = await import('./skills.js');
      const result = await listSkills(process.cwd());

      // 格式化输出
      console.log('\n📦 已安装 (%d):', result.installed.length);
      if (result.installed.length === 0) {
        console.log('  (无)');
      } else {
        for (const s of result.installed) {
          console.log('  • %s  — %s  [%s]', s.name, s.description || '(无描述)', s.source);
        }
      }

      console.log('\n💡 推荐未安装 (%d):', result.recommended.length);
      if (result.recommended.length === 0) {
        console.log('  (无)');
      } else {
        for (const s of result.recommended) {
          console.log('  • %s  — %s  [%s]', s.name, s.description || '(无描述)', s.source);
        }
      }

      if (result.nonRecommended.length > 0) {
        console.log('\n⚠️  非推荐探查 (%d):', result.nonRecommended.length);
        for (const s of result.nonRecommended) {
          console.log('  • %s  — %s  [%s]', s.name, s.description || '(来源不明)', s.source);
        }
      }

      if (result.configResidue.length > 0) {
        console.log('\n⚠️  配置残留 (%d):', result.configResidue.length);
        for (const s of result.configResidue) {
          console.log('  • %s  [%s]（目录不存在）', s.name, s.source);
        }
      }

      console.log();
    });

  skill
    .command('remove <name>')
    .description('移除 Skill')
    .option('--dry-run', '预览模式')
    .action(async (name, options) => {
      const { removeSkill } = await import('./skills.js');
      await removeSkill(name, options);
    });

  program.parse(process.argv);

  // 没有匹配子命令时显示帮助
  if (!process.argv.slice(2).length) {
    program.help();
  }
}
