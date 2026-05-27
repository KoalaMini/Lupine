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

  // 写入配置
  const config = createDefaultConfig({
    projectName,
    platform,
    repos,
  });

  // 解析相对路径：基于当前目录存储
  config.repositories = config.repositories.map((r) => ({
    ...r,
    path: isAbsolute(r.path) ? r.path : relative(targetDir, resolve(targetDir, r.path)),
  }));

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

  const totalFiles = templateFiles.length + agentFiles.length + 2;
  console.log(`\n✔  .lupine/ 已生成 (${totalFiles} 个文件)`);
  if (repos.length) {
    console.log(`✔  已关联 ${repos.length} 个仓库:`);
    repos.forEach((r) => console.log(`    • ${r}`));
  }

  console.log(`\n下一步:`);
  console.log(`  cd .lupine`);
  console.log(`  ${platform}    # 启动 AI 会话\n`);
}
