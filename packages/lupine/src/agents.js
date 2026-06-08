/**
 * Agent 定义生成器
 *
 * 根据用户选择的 AI 平台（opencode / claude），
 * 从 prompt 模板 + _agents.json 配置生成平台特定的 Agent 定义文件。
 *
 * 支持 available_skills 注入 —— 安装/移除 Skill 时自动更新 Agent 文件。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readSkillsConfig } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENTS_TEMPLATE_DIR = resolve(__dirname, '../templates/agents');
const PKG_ROOT = resolve(__dirname, '..');
const RECOMMENDED_PATH = resolve(PKG_ROOT, 'templates/skills/_recommended.json');

/**
 * 将 available_skills 数组渲染为 YAML 数组字符串
 * @param {string[]} skillsList - skill 名称列表
 * @returns {string}
 */
function renderSkillsYaml(skillsList) {
  if (!skillsList || skillsList.length === 0) {
    return 'available_skills: []\n';
  }
  const items = skillsList.map((s) => `  - ${s}`).join('\n');
  return `available_skills:\n${items}\n`;
}

/**
 * 将 MCP 配置对象渲染为 YAML 块
 * @param {object|undefined} mcpConfig - agent 的 mcp 配置
 * @returns {string}
 */
function renderMcpYaml(mcpConfig) {
  if (!mcpConfig || typeof mcpConfig !== 'object' || Object.keys(mcpConfig).length === 0) {
    return '';
  }

  const lines = ['mcp:\n'];
  for (const [name, cfg] of Object.entries(mcpConfig)) {
    lines.push(`  ${name}:\n`);
    lines.push(`    type: ${cfg.type}\n`);
    if (Array.isArray(cfg.command)) {
      lines.push('    command:\n');
      for (const arg of cfg.command) {
        lines.push(`      - ${arg}\n`);
      }
    } else {
      lines.push(`    command: ${cfg.command}\n`);
    }
    if (cfg.enabled !== undefined) {
      lines.push(`    enabled: ${cfg.enabled}\n`);
    }
  }

  return lines.join('');
}

/**
 * 渲染 opencode 格式的 Agent 定义
 */
function renderOpencodeAgent(config, promptContent, skillsList = []) {
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

  // available_skills 注入
  lines.push(renderSkillsYaml(skillsList));

  // MCP 配置注入
  lines.push(renderMcpYaml(config.mcp));

  lines.push('---\n');
  lines.push(promptContent);

  return lines.join('');
}

/**
 * 渲染 claude 格式的 Agent 定义
 */
function renderClaudeAgent(name, config, promptContent, skillsList = []) {
  const lines = ['---\n'];
  const plat = config.claude || {};

  lines.push(`name: ${name}\n`);

  if (plat.tools) lines.push(`tools: "${plat.tools}"\n`);
  if (plat.disallowedTools) lines.push(`disallowedTools: "${plat.disallowedTools}"\n`);
  if (plat.model) lines.push(`model: ${plat.model}\n`);

  lines.push(`description: ${config.description || ''}\n`);

  // available_skills 注入
  lines.push(renderSkillsYaml(skillsList));

  lines.push('---\n');
  lines.push(promptContent);

  return lines.join('');
}

/**
 * 读取 _recommended.json 并建立 agent → skills 的映射
 * @returns {Map<string, string[]>}
 */
function buildAgentSkillMap() {
  const recommendedPath = RECOMMENDED_PATH;
  const map = new Map();

  try {
    const data = JSON.parse(readFileSync(recommendedPath, 'utf-8'));
    const skills = Array.isArray(data.skills) ? data.skills : [];

    for (const skill of skills) {
      const forAgents = Array.isArray(skill.forAgents) ? skill.forAgents : [];
      for (const agent of forAgents) {
        if (!map.has(agent)) map.set(agent, []);
        map.get(agent).push(skill.name);
      }
    }
  } catch {
    // 如果推荐清单不存在，返回空映射
  }

  return map;
}

/**
 * 构建每个 Agent 的 available_skills 列表
 *
 * @param {object[]} installedSkills - config skills.installed 的条目
 * @returns {object} { agentName: [skillName, ...] }
 */
function buildAgentSkills(installedSkills) {
  const agentSkillMap = buildAgentSkillMap();
  const installedNames = new Set(
    installedSkills.map((e) => (typeof e === 'string' ? e : e.name))
  );

  const result = {};
  for (const [agent, skills] of agentSkillMap.entries()) {
    result[agent] = skills.filter((s) => installedNames.has(s));
  }

  return result;
}

/**
 * 更新生成的 Agent 文件的 available_skills 字段
 *
 * @param {string} lupineDir - .lupine/ 目录
 * @param {string} platform - "opencode" 或 "claude"
 * @param {object[]} installedSkills - config skills.installed
 */
export async function updateAgentSkills(lupineDir, platform, installedSkills) {
  const agentDirName = platform === 'claude' ? '.claude' : '.opencode';
  const agentsDir = resolve(lupineDir, agentDirName, 'agents');

  if (!existsSync(agentsDir)) return;

  const agentSkills = buildAgentSkills(installedSkills || []);

  const entries = readdirSync(agentsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

    const agentName = entry.name.replace(/\.md$/, '');
    const filePath = resolve(agentsDir, entry.name);

    let content = readFileSync(filePath, 'utf-8');

    // 检查 frontmatter 中是否已有 available_skills
    const hasSkillsField = /^available_skills:/m.test(content);

    // 构建新的 available_skills YAML
    const skillNames = agentSkills[agentName] || [];
    const skillsYaml = renderSkillsYaml(skillNames);

    if (hasSkillsField) {
      // 替换现有的 available_skills 块
      content = content.replace(
        /^available_skills:.*(?:\n\s+- .*)*/m,
        skillsYaml.replace(/\n$/, '')
      );
    } else {
      // 在 description: 行后插入
      content = content.replace(
        /^(description:.*)$/m,
        `$1\n${skillsYaml.replace(/\n$/, '')}`
      );
    }

    writeFileSync(filePath, content, 'utf-8');
  }
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

  // 读取已安装的 skills 构建 agent → skills 映射
  const skillsConfig = readSkillsConfig(lupineDir);
  const agentSkills = buildAgentSkills(skillsConfig.installed);

  const generated = [];

  for (const [name, agentConfig] of Object.entries(config)) {
    const promptContent = loadAgentPrompt(name);
    const skillsForAgent = agentSkills[name] || [];

    let fileContent;
    if (platform === 'opencode') {
      fileContent = renderOpencodeAgent(agentConfig, promptContent, skillsForAgent);
    } else {
      fileContent = renderClaudeAgent(name, agentConfig, promptContent, skillsForAgent);
    }

    const targetPath = join(agentsDir, `${name}.md`);
    writeFileSync(targetPath, fileContent, 'utf-8');
    generated.push(targetPath);
  }

  return generated;
}
