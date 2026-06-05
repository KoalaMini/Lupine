import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';

const CONFIG_FILENAME = '.lupineconfig.json';
const VERSION_FILENAME = '.lupine-version';

/**
 * 读取 .lupineconfig.json
 * @param {string} lupineDir - .lupine/ 目录路径
 * @returns {object|null}
 */
export function readConfig(lupineDir) {
  const configPath = resolve(lupineDir, CONFIG_FILENAME);
  if (!existsSync(configPath)) {
    return null;
  }
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

/**
 * 写入 .lupineconfig.json
 * @param {string} lupineDir - .lupine/ 目录路径
 * @param {object} config - 配置对象
 */
export function writeConfig(lupineDir, config) {
  const configPath = resolve(lupineDir, CONFIG_FILENAME);
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

/**
 * 读取 .lupine-version
 * @param {string} lupineDir
 * @returns {string|null}
 */
export function readVersion(lupineDir) {
  const versionPath = resolve(lupineDir, VERSION_FILENAME);
  if (!existsSync(versionPath)) {
    return null;
  }
  return readFileSync(versionPath, 'utf-8').trim();
}

/**
 * 写入 .lupine-version
 * @param {string} lupineDir
 * @param {string} version
 */
export function writeVersion(lupineDir, version) {
  const versionPath = resolve(lupineDir, VERSION_FILENAME);
  writeFileSync(versionPath, version + '\n', 'utf-8');
}

/**
 * 判断目录是否已初始化（检测 .lupineconfig.json 是否存在）
 * @param {string} lupineDir
 * @returns {boolean}
 */
export function isInitialized(lupineDir) {
  return existsSync(resolve(lupineDir, CONFIG_FILENAME));
}

/**
 * 默认 skills 空结构
 */
const DEFAULT_SKILLS = { installed: [], recommended: [], adopted: [] };

/**
 * 读取 skills 配置字段
 * @param {string} lupineDir - .lupine/ 目录路径
 * @returns {object} { installed: [], recommended: [], adopted: [] }
 */
export function readSkillsConfig(lupineDir) {
  const config = readConfig(lupineDir);
  if (!config || !config.skills) {
    return { ...DEFAULT_SKILLS };
  }
  return {
    installed: Array.isArray(config.skills.installed) ? config.skills.installed : [],
    recommended: Array.isArray(config.skills.recommended) ? config.skills.recommended : [],
    adopted: Array.isArray(config.skills.adopted) ? config.skills.adopted : [],
  };
}

/**
 * 写入 skills 配置字段（保留其他配置字段）
 * @param {string} lupineDir - .lupine/ 目录路径
 * @param {object} skillsObj - skills 配置对象 { installed, recommended, adopted }
 */
export function writeSkillsConfig(lupineDir, skillsObj) {
  const config = readConfig(lupineDir) || {};
  config.skills = {
    installed: Array.isArray(skillsObj.installed) ? skillsObj.installed : [],
    recommended: Array.isArray(skillsObj.recommended) ? skillsObj.recommended : [],
    adopted: Array.isArray(skillsObj.adopted) ? skillsObj.adopted : [],
  };
  writeConfig(lupineDir, config);
}

/**
 * 确保 .lupineconfig.json 包含 skills 字段（若没有则追加空结构）
 * @param {string} lupineDir - .lupine/ 目录路径
 */
export function ensureSkillsField(lupineDir) {
  const config = readConfig(lupineDir);
  if (!config) return;
  if (!config.skills) {
    config.skills = { ...DEFAULT_SKILLS };
    writeConfig(lupineDir, config);
  }
}

/**
 * 检测路径是否为独立 Git 仓库（含 .git）
 * @param {string} absPath - 绝对路径
 * @returns {boolean}
 */
function isIndependentGitRepo(absPath) {
  try {
    return existsSync(resolve(absPath, '.git'));
  } catch {
    return false;
  }
}

/**
 * 创建默认配置
 * @param {object} options - { projectName, platform, repos }
 * @param {string} [cwd] - 当前工作目录（用于检测 .git）
 * @returns {object}
 */
export function createDefaultConfig(options, cwd) {
  return {
    version: process.env.npm_package_version || '0.0.0',
    projectName: options.projectName || '',
    platform: options.platform || 'opencode',
    repositories: (options.repos || []).map((p) => {
      const absPath = isAbsolute(p) ? p : resolve(cwd || process.cwd(), p);
      return {
        path: p,
        type: 'code',
        independentGit: isIndependentGitRepo(absPath),
      };
    }),
  };
}
