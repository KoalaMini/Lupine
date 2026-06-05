import { existsSync, mkdirSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';

import { generateFile, getTemplateFiles } from './generate.js';
import { readConfig, writeConfig, writeVersion, isInitialized, createDefaultConfig } from './config.js';
import { writeManifest, computeChecksum } from './checksum.js';
import { generateAgents, getAgentNames } from './agents.js';

/**
 * 简易交互式问答（无需外部依赖）
 */
function askQuestion(query, defaultValue = '') {
  return new Promise((resolve) => {
    const rl = createInterface({ input, output });
    const defaultText = defaultValue ? ` (${defaultValue})` : '';
    rl.question(`? ${query}${defaultText}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

/**
 * init 命令主逻辑
 */
export async function init(options) {
  const targetDir = process.cwd();
  const lupineDir = resolve(targetDir, '.lupine');

  // 检查是否已初始化
  if (existsSync(lupineDir) && isInitialized(lupineDir)) {
    console.error(`\n❌ .lupine/ 已初始化。如需更新请使用: lupine update\n`);
    process.exit(1);
  }

  console.log('\n🐺 Lupine 项目初始化');
  console.log('--------------------\n');

  // 交互式收集参数
  const projectName = options.name || await askQuestion('请输入项目名称', 'my-lupine-project');
  const platform = options.platform || await askQuestion('请选择 AI 平台 (opencode / claude)', 'opencode');

  const repoInput = options.repo
    ? options.repo.join(' ')
    : await askQuestion('请指定代码仓库路径（可多个，用空格分隔）\n  (相对路径基于当前目录)', '');

  const repos = repoInput
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  // 创建 .lupine 目录
  mkdirSync(lupineDir, { recursive: true });

  // 生成模板文件
  const variables = { projectName };
  const templateFiles = getTemplateFiles();

  for (const relPath of templateFiles) {
    const targetPath = resolve(lupineDir, relPath);
    generateFile(relPath, targetPath, variables);
    console.log(`  ✔  ${relPath}`);
  }

  // 写入配置（传入 cwd 以便检测独立 Git 仓库）
  const config = createDefaultConfig({
    projectName,
    platform,
    repos,
  }, targetDir);

  // 解析相对路径：基于当前目录存储；再检测一次确保路径变换后 independentGit 准确
  config.repositories = config.repositories.map((r) => {
    const resolvedPath = isAbsolute(r.path) ? r.path : relative(targetDir, resolve(targetDir, r.path));
    const absPath = resolve(targetDir, resolvedPath);
    return {
      ...r,
      path: resolvedPath,
      independentGit: existsSync(resolve(absPath, '.git')),
    };
  });

  writeConfig(lupineDir, config);
  console.log(`  ✔  .lupineconfig.json`);

  // 写入版本
  writeVersion(lupineDir, config.version);
  console.log(`  ✔  .lupine-version`);

  // 生成 Agent 定义文件（平台特定）
  const agentFiles = generateAgents(lupineDir, platform);
  agentFiles.forEach((f) => {
    const rel = f.startsWith(lupineDir) ? f.slice(lupineDir.length + 1) : f;
    console.log(`  ✔  ${rel}`);
  });

  // ── Skill 处理 ──
  console.log('\n📦 安装推荐 Skill...\n');

  // 复制自研 Skill
  const { copyBuiltinSkills, installRecommendedSkills, inspectNonRecommendedSkills } = await import('./skills.js');

  const builtinSkills = await copyBuiltinSkills(lupineDir, platform);
  builtinSkills.forEach((s) => {
    if (s.skipped) {
      console.log(`  ⏭  已存在: ${s.name} → ${s.path}`);
    } else {
      console.log(`  ✔  已复制自研 Skill: ${s.name} → ${s.path}`);
    }
  });

  // 安装推荐外部 Skill
  const installResults = await installRecommendedSkills(lupineDir, platform);
  installResults.forEach((r) => {
    if (r.success) {
      if (r.skipped) {
        console.log(`  ⏭  已存在: ${r.name}`);
      } else {
        console.log(`  ✔  已安装推荐 Skill: ${r.name}`);
      }
    } else {
      console.log(`  ⚠  安装失败: ${r.name} — ${r.error}`);
    }
  });

  // 探查非推荐 Skill
  const discovered = await inspectNonRecommendedSkills(lupineDir, platform);
  if (discovered.length > 0) {
    console.log(`\n⚠️  发现非推荐 Skill（可能影响 Agent 效果）`);
    const { readSkillsConfig, writeSkillsConfig, ensureSkillsField } = await import('./config.js');
    for (const sk of discovered) {
      console.log(`  ? ${sk.name}    ${sk.description || '来源不明，未经验证'}`);
      const answer = await askQuestion(`是否纳入 Lupine 配置? (Y/n)`, 'Y');
      if (answer.toLowerCase() === 'y' || answer === '') {
        ensureSkillsField(lupineDir);
        const skillsConfig = readSkillsConfig(lupineDir);
        skillsConfig.adopted.push({
          name: sk.name,
          source: 'user-adopted',
          adoptedAt: new Date().toISOString(),
        });
        writeSkillsConfig(lupineDir, skillsConfig);
        // 更新 Agent available_skills
        const { updateAgentSkills } = await import('./agents.js');
        await updateAgentSkills(lupineDir, platform, skillsConfig.installed);
        console.log(`    ✔ 已纳入配置: ${sk.name}`);
      }
    }
  }

  // 生成 manifest（用于 update 对比）
  const allFiles = [
    ...templateFiles,
    ...agentFiles.map((f) => (f.startsWith(lupineDir) ? f.slice(lupineDir.length + 1) : f)),
  ];
  const manifest = {};
  for (const relPath of allFiles) {
    const targetPath = resolve(lupineDir, relPath);
    if (existsSync(targetPath)) {
      manifest[relPath] = await computeChecksum(targetPath);
    }
  }
  await writeManifest(lupineDir, manifest);

  const totalFiles = templateFiles.length + agentFiles.length + 2 + builtinSkills.length;
  console.log(`\n✔  .lupine/ 已生成 (${totalFiles} 个文件)`);
  if (repos.length) {
    console.log(`✔  已关联 ${repos.length} 个仓库:`);
    repos.forEach((r) => console.log(`    • ${r}`));
  }

  console.log(`\n下一步:`);
  console.log(`  cd .lupine`);
  console.log(`  ${platform}    # 启动 AI 会话\n`);
}
