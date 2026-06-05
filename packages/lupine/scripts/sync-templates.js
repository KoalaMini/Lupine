#!/usr/bin/env node

/**
 * 模板同步脚本
 * 从 Lupine 项目根同步规则文件到 packages/lupine/templates/
 *
 * 使用方式:
 *   npm run sync-templates
 *   或: node packages/lupine/scripts/sync-templates.js
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../../..');
const TEMPLATES_DIR = resolve(PROJECT_ROOT, 'packages/lupine/templates');
const MANIFEST_PATH = resolve(TEMPLATES_DIR, '_manifest.json');

/**
 * 规则来源 → 模板目标映射
 * 格式: [sourceRel, targetRel]
 */
const SYNC_MAP = [
  ['rules/coding.md', 'rules/coding.md'],
  ['rules/git.md', 'rules/git.md'],
];

/**
 * 手动管理的模板文件（不同步，直接维护在 templates/ 下）
 */
const MANUAL_TEMPLATES = [
  'CLAUDE.md',
  'PRODUCT.md',
  'README.md',
  '.gitignore',
  '.lupineconfig.json',
];

/**
 * 计算 SHA256
 */
function sha256(filePath) {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

/**
 * 主逻辑
 */
function main() {
  console.log('📦 同步规则文件到模板目录...\n');

  let synced = 0;
  const manifest = {};

  for (const [sourceRel, targetRel] of SYNC_MAP) {
    const sourcePath = resolve(PROJECT_ROOT, sourceRel);
    const targetPath = resolve(TEMPLATES_DIR, targetRel);

    if (!existsSync(sourcePath)) {
      console.warn(`  ⚠  源文件不存在，跳过: ${sourceRel}`);
      continue;
    }

    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(sourcePath, targetPath);
    manifest[targetRel] = sha256(targetPath);
    console.log(`  ✔  ${sourceRel} → templates/${targetRel}`);
    synced++;
  }

  // 为手动维护的模板也计算 checksum
  for (const rel of MANUAL_TEMPLATES) {
    const targetPath = resolve(TEMPLATES_DIR, rel);
    if (existsSync(targetPath)) {
      manifest[rel] = sha256(targetPath);
      console.log(`  ✔  ${rel} (手动模板，已记录 checksum)`);
    } else {
      console.warn(`  ⚠  手动模板不存在: ${rel}`);
    }
  }

  // 写入 manifest
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  console.log(`\n  ✔  _manifest.json (${Object.keys(manifest).length} 个文件)`);
  console.log(`\n✅ 同步完成 (${synced} 个文件已同步)\n`);
}

main();
