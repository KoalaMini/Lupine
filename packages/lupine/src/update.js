import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { generateFile, getTemplateFiles } from './generate.js';
import { readConfig, readVersion, writeVersion, isInitialized } from './config.js';
import { computeChecksum, readManifest, writeManifest, isFileUnchanged } from './checksum.js';

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
  const currentVersion = readVersion(lupineDir);
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

  for (const relPath of templateFiles) {
    const targetPath = resolve(lupineDir, relPath);
    const expectedChecksum = oldManifest ? oldManifest[relPath] : null;

    let shouldUpdate = false;

    if (!existsSync(targetPath)) {
      // 文件不存在 → 新增
      shouldUpdate = true;
    } else if (force) {
      // 强制覆盖
      shouldUpdate = true;
    } else if (expectedChecksum) {
      // 有 checksum → 检查是否被修改
      const unchanged = await isFileUnchanged(targetPath, expectedChecksum);
      shouldUpdate = unchanged;
      if (!unchanged) {
        console.log(`  ⏭  ${relPath}  (已修改，跳过。使用 --force 覆盖)`);
        skipped++;
        continue;
      }
    } else {
      // 没有旧 checksum → 默认覆盖
      shouldUpdate = true;
    }

    if (shouldUpdate) {
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
  }

  // 更新版本和 manifest
  if (!dryRun && updated > 0) {
    writeVersion(lupineDir, localVersion);

    const newManifest = {};
    for (const relPath of templateFiles) {
      const targetPath = resolve(lupineDir, relPath);
      newManifest[relPath] = await computeChecksum(targetPath);
    }
    await writeManifest(lupineDir, newManifest);

    console.log(`\n  ✔  .lupine-version  (${currentVersion || '?'} → ${localVersion})`);
  }

  // --sync-skills 选项
  if (options.syncSkills) {
    if (dryRun) {
      console.log('\n  [DRY-RUN] 将同步 builtin 和推荐外部 Skill\n');
    } else {
      console.log('\n🔄 同步 Skill...\n');
      const { syncSkills } = await import('./skills.js');
      await syncSkills(lupineDir, options);
      console.log('  ✔ Skill 已同步\n');
    }
  }

  console.log(`\n  概要: ${updated} 已更新, ${skipped} 已跳过, ${failed} 失败\n`);
  process.exit(failed > 0 ? 1 : skipped > 0 ? 1 : 0);
}
