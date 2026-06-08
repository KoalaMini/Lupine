/**
 * MCP Server 管理模块
 *
 * 从 _agents.json 读取各 Agent 推荐的 MCP Server，
 * 在 Lupine 工作区 (.lupine/.opencode/opencode.json) 中自动配置。
 *
 * 配置文件优先级（按查找顺序）：
 * 1. .lupine/.opencode/opencode.json  ← 新项目的默认位置
 * 2. .lupine/opencode.json
 * 3. 项目根目录 opencode.json         ← 兼容已有配置
 * 4. .opencode/opencode.json           ← 兼容已有配置
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENTS_CONFIG_PATH = resolve(__dirname, '../templates/agents/_agents.json');

// ─── 内部工具 ───────────────────────────────────────────────

/**
 * 从 _agents.json 读取所有 Agent 的 MCP 推荐
 * @returns {object} { serverName: { type, command, enabled, description } }
 */
export function loadRecommendedMcps() {
  try {
    const config = JSON.parse(readFileSync(AGENTS_CONFIG_PATH, 'utf-8'));
    const mcps = {};

    for (const [, agentConfig] of Object.entries(config)) {
      if (agentConfig.mcp && typeof agentConfig.mcp === 'object') {
        for (const [name, mcpConfig] of Object.entries(agentConfig.mcp)) {
          // 同名 MCP 以第一次遇到为准（避免重复）
          if (!mcps[name]) {
            mcps[name] = { ...mcpConfig };
          }
        }
      }
    }

    return mcps;
  } catch {
    return {};
  }
}

/**
 * 查找项目级 opencode.json
 *
 * 优先级（Lupine 工作区优先，兼容已有配置）：
 * 1. .lupine/.opencode/opencode.json
 * 2. .lupine/opencode.json
 * 3. 项目根目录 opencode.json
 * 4. .opencode/opencode.json
 *
 * 默认在新位置创建：.lupine/.opencode/opencode.json
 *
 * @param {string} projectDir - 项目根目录
 * @returns {string} 配置文件路径（不存在也会返回默认路径）
 */
function getProjectConfigPath(projectDir) {
  // 1. Lupine 工作区 .opencode 子目录（推荐位置）
  const lupineOpenDir = resolve(projectDir, '.lupine', '.opencode', 'opencode.json');
  if (existsSync(lupineOpenDir)) return lupineOpenDir;

  // 2. Lupine 工作区根
  const lupineJson = resolve(projectDir, '.lupine', 'opencode.json');
  if (existsSync(lupineJson)) return lupineJson;

  // 3. 项目根目录（兼容已有配置）
  const rootJson = resolve(projectDir, 'opencode.json');
  if (existsSync(rootJson)) return rootJson;

  // 4. .opencode 目录（兼容已有配置）
  const dotOpenDir = resolve(projectDir, '.opencode', 'opencode.json');
  if (existsSync(dotOpenDir)) return dotOpenDir;

  // 默认在新位置创建（不污染项目根目录）
  return lupineOpenDir;
}

/**
 * 读取项目级 opencode.json
 * @param {string} projectDir - 项目根目录
 * @returns {object}
 */
function readProjectConfig(projectDir) {
  const configPath = getProjectConfigPath(projectDir);
  if (!existsSync(configPath)) return {};

  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * 写入项目级 opencode.json
 * @param {string} projectDir - 项目根目录
 * @param {object} config
 * @returns {string} 写入的路径
 */
function writeProjectConfig(projectDir, config) {
  const configPath = getProjectConfigPath(projectDir);

  // 确保父目录存在（如果是 .opencode/opencode.json）
  const parentDir = dirname(configPath);
  mkdirSync(parentDir, { recursive: true });

  // 格式化输出，保留 $schema 在最前
  const content = JSON.stringify(config, null, 2) + '\n';
  writeFileSync(configPath, content, 'utf-8');

  return configPath;
}

// ─── 对外接口 ───────────────────────────────────────────────

/**
 * 安装推荐的 MCP Server 到项目级 opencode.json
 *
 * 幂等：如果同名 MCP 已配置且参数一致，跳过。
 * 如果已配置但参数不同，也跳过（用户自定义优先）。
 *
 * @param {string} projectDir - 项目根目录（通常为 process.cwd()）
 * @returns {{ installed: string[], skipped: string[], configPath: string }}
 */
export function installRecommendedMcps(projectDir) {
  const recommended = loadRecommendedMcps();
  const installed = [];
  const skipped = [];

  if (Object.keys(recommended).length === 0) {
    return { installed, skipped, configPath: '' };
  }

  const config = readProjectConfig(projectDir);
  const configPath = getProjectConfigPath(projectDir);

  // 确保 mcp 字段存在
  if (!config.mcp) {
    config.mcp = {};
  }

  for (const [name, mcpConfig] of Object.entries(recommended)) {
    if (config.mcp[name]) {
      // 已存在同名的 MCP 配置 → 跳过（用户自定义或之前已安装）
      skipped.push(name);
      continue;
    }

    // 安装：写入核心配置，不包含 description 等元信息
    config.mcp[name] = {
      type: mcpConfig.type,
      command: mcpConfig.command,
      enabled: mcpConfig.enabled !== false,
    };

    installed.push(name);
  }

  if (installed.length > 0 || skipped.length > 0) {
    writeProjectConfig(projectDir, config);
  }

  return { installed, skipped, configPath };
}
