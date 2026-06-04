import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const MANIFEST_FILENAME = '_manifest.json';

/**
 * 计算单个文件的 SHA256 哈希
 * @param {string} filePath - 文件绝对路径
 * @returns {Promise<string>} 十六进制哈希
 */
export async function computeChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * 读取 manifest 文件
 * @param {string} lupineDir - .lupine/ 目录
 * @returns {Promise<object|null>}
 */
export async function readManifest(lupineDir) {
  const manifestPath = resolve(lupineDir, MANIFEST_FILENAME);
  if (!existsSync(manifestPath)) {
    return null;
  }
  return JSON.parse(await readFile(manifestPath, 'utf-8'));
}

/**
 * 写入 manifest 文件
 * @param {string} lupineDir
 * @param {object} manifest - { "CLAUDE.md": "sha256hex", ... }
 */
export async function writeManifest(lupineDir, manifest) {
  const manifestPath = resolve(lupineDir, MANIFEST_FILENAME);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
}

/**
 * 检查文件是否被修改（与 manifest 中的 checksum 对比）
 * @param {string} filePath - 文件绝对路径
 * @param {string} expectedChecksum - manifest 中记录的 checksum
 * @returns {Promise<boolean>} true=未被修改, false=被修改了
 */
export async function isFileUnchanged(filePath, expectedChecksum) {
  if (!existsSync(filePath)) {
    return false;
  }
  const actual = await computeChecksum(filePath);
  return actual === expectedChecksum;
}
