/**
 * Agent 定义生成器
 *
 * 根据用户选择的 AI 平台（opencode / claude），
 * 从 prompt 模板 + _agents.json 配置生成平台特定的 Agent 定义文件。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENTS_TEMPLATE_DIR = resolve(__dirname, '../templates/agents');

/**
 * 渲染 opencode 格式的 Agent 定义
 */
function renderOpencodeAgent(config, promptContent) {
  const lines = ['---\n'];
  const plat = config.opencode || {};

  if (plat.mode) lines.push(`mode: ${plat.mode}\n`);

  if (plat.permission) {
    lines.push('permission:\n');
    for (const [key, value] of Object.entries(plat.permission)) {
      if (typeof value === 'object' && value !== null) {
        lines.push(`  ${key}:\n`);
        for (const [k, v] of Object.entries(value)) {
          const val = typeof v === 'string' ? v : JSON.stringify(v);
          lines.push(`    "${k}": ${val}\n`);
        }
      } else {
        lines.push(`  ${key}: ${value}\n`);
      }
    }
  }

  if (plat.temperature !== undefined) {
    lines.push(`temperature: ${plat.temperature}\n`);
  }

  lines.push(`description: ${config.description || ''}\n`);
  lines.push('---\n');
  lines.push(promptContent);

  return lines.join('');
}

/**
 * 渲染 claude 格式的 Agent 定义
 */
function renderClaudeAgent(name, config, promptContent) {
  const lines = ['---\n'];
  const plat = config.claude || {};

  lines.push(`name: ${name}\n`);

  if (plat.tools) lines.push(`tools: "${plat.tools}"\n`);
  if (plat.disallowedTools) lines.push(`disallowedTools: "${plat.disallowedTools}"\n`);
  if (plat.model) lines.push(`model: ${plat.model}\n`);

  lines.push(`description: ${config.description || ''}\n`);
  lines.push('---\n');
  lines.push(promptContent);

  return lines.join('');
}

/**
 * 加载 agent 配置
 * @returns {object}
 */
function loadAgentConfig() {
  const configPath = join(AGENTS_TEMPLATE_DIR, '_agents.json');
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

/**
 * 加载 agent prompt 内容
 * @param {string} agentName
 * @returns {string}
 */
function loadAgentPrompt(agentName) {
  const promptPath = join(AGENTS_TEMPLATE_DIR, `${agentName}.prompt`);
  let content = readFileSync(promptPath, 'utf-8');

  // 替换占位符（如果有的话）
  // 当前 prompt 中还没有项目特定的占位符，保留扩展性

  return content;
}

/**
 * 获取所有 agent 名称列表
 * @returns {string[]}
 */
export function getAgentNames() {
  const config = loadAgentConfig();
  return Object.keys(config);
}

/**
 * 为指定平台生成所有 Agent 定义文件
 *
 * @param {string} lupineDir - .lupine/ 目标目录
 * @param {string} platform - "opencode" 或 "claude"
 */
export function generateAgents(lupineDir, platform) {
  const config = loadAgentConfig();
  const agentsDir = platform === 'opencode'
    ? join(lupineDir, '.opencode', 'agents')
    : join(lupineDir, '.claude', 'agents');

  mkdirSync(agentsDir, { recursive: true });

  const generated = [];

  for (const [name, agentConfig] of Object.entries(config)) {
    const promptContent = loadAgentPrompt(name);

    let fileContent;
    if (platform === 'opencode') {
      fileContent = renderOpencodeAgent(agentConfig, promptContent);
    } else {
      fileContent = renderClaudeAgent(name, agentConfig, promptContent);
    }

    const targetPath = join(agentsDir, `${name}.md`);
    writeFileSync(targetPath, fileContent, 'utf-8');
    generated.push(targetPath);
  }

  return generated;
}
