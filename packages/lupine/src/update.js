import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

import { generateFile, getTemplateFiles } from './generate.js';
import { readConfig, writeConfig, isInitialized } from './config.js';
import { computeChecksum, readManifest, writeManifest, isFileUnchanged } from './checksum.js';
import { installRecommendedMcps } from './mcp.js';

const LUPINE_DIR_NAME = '.lupine';

/**
 * 语义化版本比较（简化版，仅比较数字）
 * @param {string} a - 当前版本
 * @param {string} b - 目标版本
 * @returns {number} -1: a<b, 0: a==b, 1: a>b
 */
function compareVersions(a, b) {
  const partsA = a.replace(/^v/, '').split('.').map(Number);
  const partsB = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const delta = (partsA[i] || 0) - (partsB[i] || 0);
    if (delta !== 0) return delta < 0 ? -1 : 1;
  }
  return 0;
}

/**
 * 获取本地版本（从 npm 包的 package.json）
 * @returns {string}
 */
function getLocalVersion() {
  return process.env.npm_package_version || '0.0.0';
}

/**
 * 判断文件是否需要更新
 * @param {string} fileRelPath - 相对 .lupine/ 的路径
 * @param {string} lupineDir - .lupine/ 绝对路径
 * @param {object|null} oldManifest - 旧 manifest
 * @param {boolean} force - 是否强制覆盖
 * @returns {Promise<{ shouldUpdate: boolean, exists: boolean }>}
 */
async function checkShouldUpdate(fileRelPath, lupineDir, oldManifest, force) {
  const targetPath = resolve(lupineDir, fileRelPath);
  const exists = existsSync(targetPath);
  const expectedChecksum = oldManifest ? oldManifest[fileRelPath] : null;

  if (!exists) return { shouldUpdate: true, exists: false };
  if (force) return { shouldUpdate: true, exists: true };

  if (expectedChecksum) {
    const unchanged = await isFileUnchanged(targetPath, expectedChecksum);
    return { shouldUpdate: unchanged, exists: true };
  }

  // 没有旧 checksum → 默认覆盖
  return { shouldUpdate: true, exists: true };
}

/**
 * 收集 manifest 中所有需要追踪的文件路径，剔除不存在的
 * @param {string} lupineDir - .lupine/ 绝对路径
 * @param {string[]} templateFiles - 模板文件相对路径列表
 * @param {string[]} agentFiles - Agent 文件相对路径列表
 * @param {string[]} skillFiles - Skill 文件相对路径列表
 * @returns {Promise<object>} manifest 对象
 */
async function buildManifest(lupineDir, templateFiles, agentFiles, skillFiles) {
  const allFiles = [...templateFiles, ...agentFiles, ...skillFiles];
  const manifest = {};
  for (const relPath of allFiles) {
    const absPath = resolve(lupineDir, relPath);
    if (existsSync(absPath)) {
      manifest[relPath] = await computeChecksum(absPath);
    }
  }
  return manifest;
}

/**
 * update 命令主逻辑
 */
export async function update(options) {
  const targetDir = process.cwd();
  const lupineDir = resolve(targetDir, LUPINE_DIR_NAME);

  // 检查是否已初始化
  if (!existsSync(lupineDir) || !isInitialized(lupineDir)) {
    console.error(`\n❌ 未检测到 .lupine/ 工作区。请先运行: lupine init\n`);
    process.exit(2);
  }

  const config = readConfig(lupineDir);
  const currentVersion = config?.version || null;
  const localVersion = getLocalVersion();

  console.log('\n🐺 检查 .lupine/ 更新...\n');

  if (currentVersion) {
    console.log(`  当前版本: ${currentVersion}`);
  }
  console.log(`  最新版本: ${localVersion}\n`);

  // 版本比较
  if (currentVersion && compareVersions(localVersion, currentVersion) <= 0) {
    console.log(`  ✔ 已是最新版\n`);
    process.exit(3);
  }

  // 读取旧的 manifest
  const oldManifest = await readManifest(lupineDir);
  const templateFiles = getTemplateFiles();
  const force = options.force || false;
  const dryRun = options.dryRun || false;

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  // ──────────────────────────────────────────────────
  // Pass 1: 通用模板文件（直接复制）
  // ──────────────────────────────────────────────────
  for (const relPath of templateFiles) {
    const targetPath = resolve(lupineDir, relPath);
    const { shouldUpdate } = await checkShouldUpdate(relPath, lupineDir, oldManifest, force);

    if (!shouldUpdate) {
      console.log(`  ⏭  ${relPath}  (已修改，跳过。使用 --force 覆盖)`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  🔍  ${relPath}  (将更新)`);
      updated++;
    } else {
      try {
        generateFile(relPath, targetPath, {
          projectName: config?.projectName || '',
        });
        console.log(`  ✔  ${relPath}  (已更新)`);
        updated++;
      } catch (err) {
        console.error(`  ❌  ${relPath}  (失败: ${err.message})`);
        failed++;
      }
    }
  }

  // ──────────────────────────────────────────────────
  // Pass 2: Agent 提示词重新生成
  // ──────────────────────────────────────────────────
  const { generateAgents, getAgentNames } = await import('./agents.js');
  const platform = config?.platform || 'opencode';
  const platformDirName = platform === 'claude' ? '.claude' : '.opencode';
  const agentNames = getAgentNames();

  const agentFilesToGenerate = [];
  for (const name of agentNames) {
    const fileRelPath = `${platformDirName}/agents/${name}.md`;
    const { shouldUpdate } = await checkShouldUpdate(fileRelPath, lupineDir, oldManifest, force);

    if (!shouldUpdate) {
      console.log(`  ⏭  ${fileRelPath}  (自定义过，保留用户改动。使用 --force 覆盖)`);
      skipped++;
      continue;
    }
    agentFilesToGenerate.push(name);

    if (dryRun) {
      console.log(`  🔍  ${fileRelPath}  (将更新)`);
      updated++;
    }
  }

  if (!dryRun && agentFilesToGenerate.length > 0) {
    console.log('\n🧠 同步 Agent 提示词...\n');
    generateAgents(lupineDir, platform);
    for (const name of agentFilesToGenerate) {
      console.log(`  ✔  ${platformDirName}/agents/${name}.md  (已更新)`);
    }
    updated += agentFilesToGenerate.length;
  }

  // ──────────────────────────────────────────────────
  // Pass 3: 自研 Skill（builtin）同步
  // ──────────────────────────────────────────────────
  const { copyBuiltinSkills, loadRecommendedList } = await import('./skills.js');
  const recommendedList = loadRecommendedList();
  const builtinSkillNames = recommendedList
    .filter((s) => s.source === 'builtin')
    .map((s) => s.name);

  const skillFilesToSync = [];
  for (const skillName of builtinSkillNames) {
    const fileRelPath = `${platformDirName}/skills/${skillName}/SKILL.md`;
    const { shouldUpdate } = await checkShouldUpdate(fileRelPath, lupineDir, oldManifest, force);

    if (!shouldUpdate) {
      console.log(`  ⏭  ${fileRelPath}  (已修改，跳过。使用 --force 覆盖)`);
      skipped++;
      continue;
    }
    skillFilesToSync.push(skillName);

    if (dryRun) {
      console.log(`  🔍  ${platformDirName}/skills/${skillName}/  (将同步)`);
      updated++;
    }
  }

  if (!dryRun && skillFilesToSync.length > 0) {
    console.log('\n📦 同步自研 Skill...\n');
    // 先删除旧目录，再让 copyBuiltinSkills 重建
    for (const skillName of skillFilesToSync) {
      const targetPath = resolve(lupineDir, platformDirName, 'skills', skillName);
      if (existsSync(targetPath)) {
        rmSync(targetPath, { recursive: true, force: true });
      }
    }
    await copyBuiltinSkills(lupineDir, platform);
    for (const skillName of skillFilesToSync) {
      console.log(`  ✔  ${platformDirName}/skills/${skillName}/  (已同步)`);
    }
    updated += skillFilesToSync.length;
  }

  // ──────────────────────────────────────────────────
  // Pass 4: MCP Server 同步
  // ──────────────────────────────────────────────────
  if (!dryRun) {
    const mcpResult = installRecommendedMcps(targetDir);
    if (mcpResult.installed.length > 0 || mcpResult.skipped.length > 0) {
      console.log('\n🔌 同步 MCP Server...\n');
      mcpResult.installed.forEach((name) => console.log(`  ✔  已配置 MCP: ${name}`));
      mcpResult.skipped.forEach((name) => console.log(`  ⏭  已存在: ${name}`));
      if (mcpResult.configPath) {
        const relPath = mcpResult.configPath.startsWith(targetDir)
          ? mcpResult.configPath.slice(targetDir.length + 1)
          : mcpResult.configPath;
        console.log(`  📄  配置文件: ${relPath}\n`);
      }
    }
  }

  // ──────────────────────────────────────────────────
  // 更新版本和 manifest
  // ──────────────────────────────────────────────────
  if (!dryRun && updated > 0) {
    config.version = localVersion;
    writeConfig(lupineDir, config);

    const agentFilePaths = agentNames.map((n) => `${platformDirName}/agents/${n}.md`);
    const skillFilePaths = builtinSkillNames.map((n) => `${platformDirName}/skills/${n}/SKILL.md`);

    const newManifest = await buildManifest(lupineDir, templateFiles, agentFilePaths, skillFilePaths);
    await writeManifest(lupineDir, newManifest);

    console.log(`\n  ✔  version  (${currentVersion || '?'} → ${localVersion})`);
  }

  // --sync-skills 选项（外部推荐 Skill，需网络下载）
  if (options.syncSkills) {
    if (dryRun) {
      console.log('\n  [DRY-RUN] 将同步外部推荐 Skill\n');
    } else {
      console.log('\n🔄 同步外部推荐 Skill...\n');
      const { syncSkills } = await import('./skills.js');
      await syncSkills(lupineDir, options);
    }
  }

  console.log(`\n  概要: ${updated} 已更新, ${skipped} 已跳过, ${failed} 失败\n`);
  process.exit(failed > 0 ? 1 : skipped > 0 ? 1 : 0);
}
