/**
 * Skill 核心管理模块
 *
 * 集中处理 Skill 的 添加/列出/移除/同步/探查 逻辑。
 * 不直接依赖 CLI 层，通过 config.js 和 agents.js 与其他模块交互。
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { resolve, join, isAbsolute, relative, basename, dirname } from 'node:path';
import { execSync, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { tmpdir, platform as osPlatform } from 'node:os';
import { fileURLToPath } from 'node:url';

import { readConfig, readSkillsConfig, writeSkillsConfig, ensureSkillsField } from './config.js';
import { updateAgentSkills } from './agents.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, '../templates');
const RECOMMENDED_PATH = resolve(TEMPLATES_DIR, 'skills/_recommended.json');

// ─── 内部工具函数 ───────────────────────────────────────────────

/**
 * 获取平台对应的子目录名
 * @param {string} platform - "opencode" 或 "claude"
 * @returns {string}
 */
function getPlatformDir(platform) {
  return platform === 'claude' ? '.claude' : '.opencode';
}

/**
 * 读取 _recommended.json
 * @returns {object[]}
 */
function loadRecommendedList() {
  if (!existsSync(RECOMMENDED_PATH)) return [];
  try {
    const data = JSON.parse(readFileSync(RECOMMENDED_PATH, 'utf-8'));
    return Array.isArray(data.skills) ? data.skills : [];
  } catch {
    return [];
  }
}

/**
 * 向用户输出消息（CLI 友好）
 */
function log(msg) {
  console.log(msg);
}

function warn(msg) {
  console.error(`  ⚠ ${msg}`);
}

function error(msg) {
  console.error(`  ❌ ${msg}`);
}

// ─── 2.2: Skill 来源解析 ───────────────────────────────────────

/**
 * 解析 Skill 来源字符串，返回类型化对象
 *
 * @param {string} source - 来源字符串
 * @returns {{ type: string, [key: string]: any }}
 * @throws {Error} 无法识别的来源
 */
function parseSkillSource(source) {
  if (!source || typeof source !== 'string') {
    throw new Error('Skill 来源不能为空');
  }

  // 1. GitHub URL 模式
  const githubMatch = source.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\/|$)/);
  if (githubMatch) {
    const [, owner, repo] = githubMatch;
    return {
      type: 'github',
      owner,
      repo: repo.replace(/\.git$/, ''),
      branch: 'main',
      original: source,
    };
  }

  // 2. npm 命令模式（以 npx 或 npm 开头）
  if (/^(npx|npm)\s/.test(source)) {
    return {
      type: 'npm',
      command: source,
      original: source,
    };
  }

  // 3. 本地路径模式（以 / ./ ../ 开头或为绝对路径）
  if (source.startsWith('/') || source.startsWith('./') || source.startsWith('../') || isAbsolute(source)) {
    const resolvedPath = resolve(process.cwd(), source);
    return {
      type: 'local',
      path: resolvedPath,
      original: source,
    };
  }

  // 4. 简单名称模式 — 查询 _recommended.json
  const recommended = loadRecommendedList();
  const matched = recommended.find((s) => s.name === source);
  if (matched) {
    if (matched.source === 'builtin') {
      return {
        type: 'builtin',
        name: matched.name,
        forAgents: matched.forAgents || [],
        original: source,
      };
    }
    if (matched.source === 'npm' || matched.installCommand) {
      return {
        type: 'npm',
        command: matched.installCommand || `npx ${matched.name} skills install`,
        name: matched.name,
        forAgents: matched.forAgents || [],
        original: source,
      };
    }
    if (typeof matched.source === 'string' && matched.source.startsWith('http')) {
      // 推荐中的 GitHub URL
      const ghMatch = matched.source.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\/|$)/);
      if (ghMatch) {
        return {
          type: 'github',
          owner: ghMatch[1],
          repo: ghMatch[2].replace(/\.git$/, ''),
          branch: 'main',
          skillPath: matched.skillPath || undefined,
          name: matched.name,
          forAgents: matched.forAgents || [],
          original: source,
        };
      }
      return { type: 'url', url: matched.source, name: matched.name, original: source };
    }
    // fallback: treat as npm
    return {
      type: 'npm',
      command: `npx ${matched.name} skills install`,
      name: matched.name,
      forAgents: matched.forAgents || [],
      original: source,
    };
  }

  // 5. 非法来源
  throw new Error(`无法识别的 Skill 来源: "${source}"。\n  支持的格式: GitHub URL (https://github.com/...)、npm 命令 (npx ...)、本地路径、或 _recommended.json 中定义的名称`);
}

// ─── 2.3: 下载与文件复制 ───────────────────────────────────────

/**
 * 下载 Skill 到临时目录
 *
 * @param {{ type: string }} sourceInfo - parseSkillSource 返回的对象
 * @param {string} tempDir - 临时目录路径
 * @returns {Promise<string>} 下载后的技能目录路径
 */
async function downloadSkill(sourceInfo, tempDir) {
  mkdirSync(tempDir, { recursive: true });

  switch (sourceInfo.type) {
    case 'github': {
      const repoUrl = `https://github.com/${sourceInfo.owner}/${sourceInfo.repo}.git`;
      log(`  ℹ  克隆仓库: ${repoUrl}`);
      execFileSync('git', ['clone', '--depth', '1', repoUrl, tempDir], {
        stdio: 'pipe',
        timeout: 60000,
      });
      // 如果指定了 skillPath，在该路径下寻找 SKILL.md
      if (sourceInfo.skillPath) {
        const skillDir = resolve(tempDir, sourceInfo.skillPath);
        if (!existsSync(skillDir)) {
          throw new Error(`Skill 子目录不存在: ${sourceInfo.skillPath}（在 ${sourceInfo.repo} 中）`);
        }
        return skillDir;
      }
      return tempDir;
    }

    case 'local': {
      const localPath = sourceInfo.path;
      if (!existsSync(localPath)) {
        throw new Error(`本地路径不存在: ${localPath}`);
      }
      // 将本地内容复制到 tempDir
      cpSync(localPath, tempDir, { recursive: true });
      return tempDir;
    }

    case 'npm': {
      log(`  ℹ  执行: ${sourceInfo.command}`);
      execSync(sourceInfo.command, { stdio: 'inherit', timeout: 120000, cwd: tempDir });
      return tempDir;
    }

    case 'builtin': {
      // builtin 不需要下载，直接从模板复制
      const builtinSrc = resolve(TEMPLATES_DIR, 'skills', sourceInfo.name);
      if (!existsSync(builtinSrc)) {
        throw new Error(`内置 Skill 模板不存在: ${sourceInfo.name}`);
      }
      cpSync(builtinSrc, tempDir, { recursive: true });
      return tempDir;
    }

    default:
      throw new Error(`不支持的来源类型: ${sourceInfo.type}`);
  }
}

/**
 * 复制 Skill 到目标目录
 *
 * @param {string} sourcePath - 下载/解析后的源路径（含 SKILL.md）
 * @param {string} targetDir - 目标目录（如 .opencode/skills/{name}/）
 * @param {string} skillName - Skill 名称
 * @returns {string} 目标路径
 */
function copySkillToTarget(sourcePath, targetDir, skillName) {
  const finalTarget = resolve(targetDir, skillName);
  mkdirSync(finalTarget, { recursive: true });

  // 复制 sourcePath 下所有文件到 finalTarget
  if (existsSync(sourcePath)) {
    const entries = readdirSync(sourcePath);
    for (const entry of entries) {
      const src = resolve(sourcePath, entry);
      const dest = resolve(finalTarget, entry);
      cpSync(src, dest, { recursive: true });
    }
  } else {
    throw new Error('源目录不存在: ' + sourcePath);
  }

  return finalTarget;
}

// ─── 2.4: SKILL.md 格式校验 ────────────────────────────────────

/**
 * 校验 SKILL.md Frontmatter 格式
 *
 * @param {string} skillDir - Skill 目录路径
 * @returns {{ valid: boolean, name: string, errors: string[], warnings: string[] }}
 */
function validateSkill(skillDir) {
  const result = { valid: true, name: '', errors: [], warnings: [] };
  const skillPath = resolve(skillDir, 'SKILL.md');

  if (!existsSync(skillPath)) {
    result.valid = false;
    result.errors.push(`SKILL.md 文件不存在: ${skillPath}`);
    return result;
  }

  let content;
  try {
    content = readFileSync(skillPath, 'utf-8');
  } catch (e) {
    result.valid = false;
    result.errors.push(`无法读取 SKILL.md: ${e.message}`);
    return result;
  }

  // 检查 Frontmatter 包裹
  if (!content.startsWith('---\n')) {
    result.valid = false;
    result.errors.push('SKILL.md 缺少开头的 "---" frontmatter 标记');
    return result;
  }

  const endIndex = content.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    result.valid = false;
    result.errors.push('SKILL.md 缺少结尾的 "---" frontmatter 标记');
    return result;
  }

  const yamlBlock = content.slice(4, endIndex);

  // 简易 YAML 解析（仅提取 name 和 description）
  // 使用正则提取，避免引入外部依赖
  const nameMatch = yamlBlock.match(/^name:\s*(.+)$/m);
  const descMatch = yamlBlock.match(/^description:\s*(.+)$/m);

  if (!nameMatch) {
    result.errors.push('SKILL.md frontmatter 缺少必填字段: name');
    result.valid = false;
  } else {
    result.name = nameMatch[1].trim();
  }

  if (!descMatch) {
    result.warnings.push('SKILL.md frontmatter 缺少推荐字段: description');
  }

  return result;
}

// ─── 2.6: listSkills ────────────────────────────────────────────

/**
 * 列出已安装、推荐、非推荐、配置残留的 Skill
 *
 * @param {string} lupineDir - .lupine/ 目录路径
 * @returns {Promise<{ installed: object[], recommended: object[], nonRecommended: object[], configResidue: object[] }>}
 */
export function listSkills(lupineDir) {
  const config = readConfig(lupineDir);
  const platform = config?.platform || 'opencode';
  const platformDir = resolve(lupineDir, getPlatformDir(platform), 'skills');

  const skillsConfig = readSkillsConfig(lupineDir);
  const recommendedList = loadRecommendedList();

  const installed = [];
  const configResidue = [];

  // 1. 验证 config 中的 installed[]
  for (const entry of skillsConfig.installed) {
    const name = typeof entry === 'string' ? entry : entry.name;
    const skillDir = resolve(platformDir, name);
    if (existsSync(skillDir)) {
      const validation = validateSkill(skillDir);
      installed.push({
        name: validation.name || name,
        description: validation.warnings.length > 0 ? '(缺少 description)' : '',
        source: typeof entry === 'object' && entry.source ? entry.source : 'unknown',
        path: skillDir,
      });
      // 尝试读取实际 description
      try {
        const content = readFileSync(resolve(skillDir, 'SKILL.md'), 'utf-8');
        const descMatch = content.match(/^description:\s*(.+)$/m);
        if (descMatch) {
          installed[installed.length - 1].description = descMatch[1].trim();
        }
      } catch {
        // ignore
      }
    } else {
      warn(`配置残留: ${name}（目录不存在）`);
      configResidue.push({ name, source: typeof entry === 'object' && entry.source ? entry.source : 'unknown' });
    }
  }

  // 2. 推荐但未安装
  const installedNames = new Set(installed.map((s) => s.name));
  const adoptedNames = new Set(skillsConfig.adopted.map((s) => (typeof s === 'string' ? s : s.name)));
  const recommended = recommendedList
    .filter((s) => !installedNames.has(s.name) && !adoptedNames.has(s.name))
    .map((s) => ({
      name: s.name,
      description: s.description,
      source: s.source === 'builtin' ? 'builtin' : s.source.startsWith('http') ? 'github' : s.source,
    }));

  // 3. 非推荐已安装（探查）
  const nonRecommended = [];
  const recommendedNames = new Set(recommendedList.map((s) => s.name));

  if (existsSync(platformDir)) {
    const entries = readdirSync(platformDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      // 排除已记录的
      if (installedNames.has(name) || recommendedNames.has(name) || adoptedNames.has(name)) continue;

      const skillDir = resolve(platformDir, name);
      const skillPath = resolve(skillDir, 'SKILL.md');
      if (existsSync(skillPath)) {
        const validation = validateSkill(skillDir);
        nonRecommended.push({
          name: validation.name || name,
          description: '',
          source: 'unknown',
          path: skillDir,
        });
        try {
          const content = readFileSync(skillPath, 'utf-8');
          const descMatch = content.match(/^description:\s*(.+)$/m);
          if (descMatch) {
            nonRecommended[nonRecommended.length - 1].description = descMatch[1].trim();
          }
        } catch {
          // ignore
        }
      }
    }
  }

  return { installed, recommended, nonRecommended, configResidue };
}

// ─── 2.5: addSkill ──────────────────────────────────────────────

/**
 * 安装 Skill（先验后迁两阶段策略）
 *
 * @param {string} source - Skill 来源
 * @param {object} options - { skill, platform, dryRun, force }
 */
export async function addSkill(source, options = {}) {
  const targetDir = process.cwd();
  const lupineDir = resolve(targetDir, '.lupine');

  if (!existsSync(lupineDir)) {
    error(`未检测到 .lupine/ 工作区。请先运行: lupine init`);
    process.exit(1);
  }

  const config = readConfig(lupineDir);
  const platform = options.platform || config?.platform || 'opencode';
  const platformDirName = getPlatformDir(platform);
  const skillsTargetDir = resolve(lupineDir, platformDirName, 'skills');
  const dryRun = options.dryRun || false;
  const force = options.force || false;

  // ── Phase 1: 解析 & 预下载 ──
  let sourceInfo;
  try {
    sourceInfo = parseSkillSource(source);
  } catch (e) {
    error(e.message);
    process.exit(1);
  }

  // 最终确定的 skill 名称
  let skillName = options.skill || sourceInfo.name || '';
  let tempDir = '';
  let downloadedPath = '';
  let validationResult = null;

  // 生成唯一临时目录
  tempDir = resolve(tmpdir(), `lupine-skill-${randomUUID()}`);

  try {
    // 对于 builtin 类型，不需要真正下载
    downloadedPath = await downloadSkill(sourceInfo, tempDir);

    // 如果有 --skill 参数指定子目录，在临时目录中定位
    if (options.skill) {
      const subDir = resolve(downloadedPath, options.skill);
      if (!existsSync(subDir)) {
        throw new Error(`未找到指定 Skill 子目录: ${options.skill}`);
      }
      downloadedPath = subDir;
    }

    // 如果没有指定名称，从校验中提取
    if (!skillName) {
      validationResult = validateSkill(downloadedPath);
      skillName = validationResult.name;
    }

    if (!skillName) {
      throw new Error('无法确定 Skill 名称。请使用 --skill 参数指定');
    }

    // 校验 SKILL.md
    if (!validationResult) {
      validationResult = validateSkill(downloadedPath);
    }

    if (!validationResult.valid) {
      const errMsg = validationResult.errors.join('; ');
      throw new Error(`Skill 校验失败: ${errMsg}`);
    }

    if (validationResult.warnings.length > 0) {
      validationResult.warnings.forEach((w) => warn(w));
    }

    // ── Phase 2（校验通过后执行） ──
    const targetPath = resolve(skillsTargetDir, skillName);

    // 幂等性检查
    if (existsSync(targetPath)) {
      if (force) {
        if (dryRun) {
          log(`  [DRY-RUN] 将删除现有目录并重新安装: ${skillName}`);
        } else {
          log(`  ℹ  强制重新安装: ${skillName}`);
          rmSync(targetPath, { recursive: true, force: true });
        }
      } else {
        const skipMsg = `⚠ Skill ${skillName} 已安装（使用 --force 重新安装）`;
        log(`  ${skipMsg}`);
        return;
      }
    }

    if (dryRun) {
      log(`  [DRY-RUN] 将安装 ${skillName} → ${targetPath}`);
      log(`  [DRY-RUN] 操作列表:`);
      log(`    • 创建目录: ${targetPath}`);
      log(`    • 复制 Skill 文件`);
      log(`    • 更新 .lupineconfig.json skills.installed`);
      log(`    • 更新 Agent 配置文件 available_skills`);
      return;
    }

    // 执行安装
    mkdirSync(skillsTargetDir, { recursive: true });
    const finalPath = copySkillToTarget(downloadedPath, skillsTargetDir, skillName);
    log(`  ✔  已复制: ${skillName} → ${finalPath}`);

    // 更新 config
    ensureSkillsField(lupineDir);
    const skillsConfig = readSkillsConfig(lupineDir);
    // 检查是否已存在
    const alreadyInstalled = skillsConfig.installed.some(
      (e) => (typeof e === 'string' ? e : e.name) === skillName
    );
    if (!alreadyInstalled) {
      const entry = {
        name: skillName,
        source: sourceInfo.original || source,
        installedAt: new Date().toISOString(),
      };
      skillsConfig.installed.push(entry);
      writeSkillsConfig(lupineDir, skillsConfig);
      log(`  ✔  已更新配置: skills.installed 添加 ${skillName}`);
    }

    // 更新 Agent available_skills
    await updateAgentSkills(lupineDir, platform, skillsConfig.installed);
    log(`  ✔  已更新 Agent 配置: available_skills`);
  } finally {
    // 清理临时目录
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

// ─── 2.7: removeSkill ───────────────────────────────────────────

/**
 * 移除 Skill
 *
 * @param {string} name - Skill 名称
 * @param {object} options - { dryRun }
 */
export async function removeSkill(name, options = {}) {
  const targetDir = process.cwd();
  const lupineDir = resolve(targetDir, '.lupine');

  if (!existsSync(lupineDir)) {
    error(`未检测到 .lupine/ 工作区`);
    process.exit(1);
  }

  const config = readConfig(lupineDir);
  const platform = config?.platform || 'opencode';
  const platformDirName = getPlatformDir(platform);
  const skillDir = resolve(lupineDir, platformDirName, 'skills', name);

  if (!existsSync(skillDir)) {
    error(`Skill 目录不存在: ${name}（${skillDir}）`);
    return;
  }

  const dryRun = options.dryRun || false;

  if (dryRun) {
    log(`  [DRY-RUN] 将删除 ${name} 目录: ${skillDir}`);
    log(`  [DRY-RUN] 将从 config skills.installed 和 skills.adopted 中移除 ${name}`);
    log(`  [DRY-RUN] 将从 Agent 文件中移除 ${name} 引用`);
    return;
  }

  // 删除目录
  rmSync(skillDir, { recursive: true, force: true });
  log(`  ✔  已删除目录: ${skillDir}`);

  // 从 config 中移除
  const skillsConfig = readSkillsConfig(lupineDir);
  skillsConfig.installed = skillsConfig.installed.filter(
    (e) => (typeof e === 'string' ? e : e.name) !== name
  );
  skillsConfig.adopted = skillsConfig.adopted.filter(
    (e) => (typeof e === 'string' ? e : e.name) !== name
  );
  writeSkillsConfig(lupineDir, skillsConfig);
  log(`  ✔  已更新配置: 移除 ${name}`);

  // 更新 Agent available_skills
  await updateAgentSkills(lupineDir, platform, skillsConfig.installed);
  log(`  ✔  已更新 Agent 配置: 移除 ${name} 引用`);
}

// ─── 2.9: copyBuiltinSkills ─────────────────────────────────────

/**
 * 复制自研（builtin）Skill 到目标平台目录
 *
 * @param {string} lupineDir - .lupine/ 目录
 * @param {string} platform - "opencode" 或 "claude"
 * @returns {Promise<object[]>} 安装的 skill 列表
 */
export async function copyBuiltinSkills(lupineDir, platform) {
  const recommendedList = loadRecommendedList();
  const builtinSkills = recommendedList.filter((s) => s.source === 'builtin');
  const platformDirName = getPlatformDir(platform);
  const skillsTargetDir = resolve(lupineDir, platformDirName, 'skills');

  const installed = [];

  for (const skill of builtinSkills) {
    const srcDir = resolve(TEMPLATES_DIR, 'skills', skill.name);
    if (!existsSync(srcDir)) {
      warn(`内置 Skill 模板不存在: ${skill.name}`);
      continue;
    }

    const targetPath = resolve(skillsTargetDir, skill.name);
    mkdirSync(skillsTargetDir, { recursive: true });

    // 如果已存在，跳过（除非 force）
    if (existsSync(targetPath)) {
      installed.push({ name: skill.name, path: targetPath, skipped: true });
      continue;
    }

    cpSync(srcDir, targetPath, { recursive: true });

    // 更新 config
    ensureSkillsField(lupineDir);
    const skillsConfig = readSkillsConfig(lupineDir);
    const alreadyInstalled = skillsConfig.installed.some(
      (e) => (typeof e === 'string' ? e : e.name) === skill.name
    );
    if (!alreadyInstalled) {
      skillsConfig.installed.push({
        name: skill.name,
        source: 'builtin',
        installedAt: new Date().toISOString(),
      });
      writeSkillsConfig(lupineDir, skillsConfig);
    }

    installed.push({ name: skill.name, path: targetPath, skipped: false });
  }

  // 更新 Agent available_skills
  const skillsConfig = readSkillsConfig(lupineDir);
  await updateAgentSkills(lupineDir, platform, skillsConfig.installed);

  return installed;
}

// ─── 2.10: installRecommendedSkills ─────────────────────────────

/**
 * 安装推荐的外部 Skill（非 builtin）
 *
 * @param {string} lupineDir - .lupine/ 目录
 * @param {string} platform - "opencode" 或 "claude"
 * @returns {Promise<object[]>} 安装结果列表
 */
export async function installRecommendedSkills(lupineDir, platform) {
  const recommendedList = loadRecommendedList();
  const nonBuiltinSkills = recommendedList.filter((s) => s.source !== 'builtin');
  const results = [];

  ensureSkillsField(lupineDir);

  for (const skill of nonBuiltinSkills) {
    try {
      // 预先解析来源以获取名称
      const sourceInfo = parseSkillSource(skill.name);
      if (!sourceInfo.name) sourceInfo.name = skill.name;
      if (!sourceInfo.forAgents) sourceInfo.forAgents = skill.forAgents || [];

      const tempDir = resolve(tmpdir(), `lupine-skill-${randomUUID()}`);

      try {
        const downloadedPath = await downloadSkill(sourceInfo, tempDir);

        const skillsTargetDir = resolve(lupineDir, getPlatformDir(platform), 'skills');
        mkdirSync(skillsTargetDir, { recursive: true });

        const targetPath = resolve(skillsTargetDir, skill.name);

        // 幂等跳过
        if (existsSync(targetPath)) {
          results.push({ name: skill.name, success: true, skipped: true });
          continue;
        }

        // 确定要复制的路径
        let copySource = downloadedPath;
        if (skill.skillPath) {
          const subDir = resolve(downloadedPath, skill.skillPath);
          if (existsSync(subDir)) {
            copySource = subDir;
          }
        } else if (sourceInfo.type === 'npm') {
          // npm 来源可能把文件装到子目录，需要找到实际包含 SKILL.md 的目录
          const findSkillDir = (dir) => {
            if (existsSync(resolve(dir, 'SKILL.md'))) return dir;
            const entries = readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.isDirectory()) {
                const found = findSkillDir(resolve(dir, entry.name));
                if (found) return found;
              }
            }
            return null;
          };
          const actualDir = findSkillDir(downloadedPath);
          if (actualDir) {
            copySource = actualDir;
          }
        }

        cpSync(copySource, targetPath, { recursive: true });

        // 更新 config
        const skillsConfig = readSkillsConfig(lupineDir);
        const alreadyInstalled = skillsConfig.installed.some(
          (e) => (typeof e === 'string' ? e : e.name) === skill.name
        );
        if (!alreadyInstalled) {
          skillsConfig.installed.push({
            name: skill.name,
            source: skill.source,
            installedAt: new Date().toISOString(),
          });
          writeSkillsConfig(lupineDir, skillsConfig);
        }

        results.push({ name: skill.name, success: true });
      } finally {
        if (existsSync(tempDir)) {
          rmSync(tempDir, { recursive: true, force: true });
        }
      }
    } catch (e) {
      warn(`安装失败: ${skill.name} — ${e.message}`);
      results.push({ name: skill.name, success: false, error: e.message });
    }
  }

  // 更新 Agent available_skills
  const skillsConfig = readSkillsConfig(lupineDir);
  await updateAgentSkills(lupineDir, platform, skillsConfig.installed);

  return results;
}

// ─── 2.11: inspectNonRecommendedSkills ──────────────────────────

/**
 * 探查非推荐 Skill（目录中有但不在推荐和已安装列表中的）
 *
 * @param {string} lupineDir - .lupine/ 目录
 * @param {string} platform - "opencode" 或 "claude"
 * @returns {Promise<object[]>} 探查结果
 */
export async function inspectNonRecommendedSkills(lupineDir, platform) {
  const platformDirName = getPlatformDir(platform);
  const skillsDir = resolve(lupineDir, platformDirName, 'skills');

  if (!existsSync(skillsDir)) return [];

  const skillsConfig = readSkillsConfig(lupineDir);
  const recommendedList = loadRecommendedList();

  const installedNames = new Set(
    skillsConfig.installed.map((e) => (typeof e === 'string' ? e : e.name))
  );
  const recommendedNames = new Set(recommendedList.map((s) => s.name));
  const adoptedNames = new Set(
    skillsConfig.adopted.map((e) => (typeof e === 'string' ? e : e.name))
  );

  const discovered = [];

  const entries = readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (installedNames.has(name) || recommendedNames.has(name) || adoptedNames.has(name)) continue;

    const skillDir = resolve(skillsDir, name);
    const skillPath = resolve(skillDir, 'SKILL.md');
    if (!existsSync(skillPath)) continue;

    const validation = validateSkill(skillDir);
    discovered.push({
      name: validation.name || name,
      description: '',
      path: skillDir,
    });

    try {
      const content = readFileSync(skillPath, 'utf-8');
      const descMatch = content.match(/^description:\s*(.+)$/m);
      if (descMatch) {
        discovered[discovered.length - 1].description = descMatch[1].trim();
      }
    } catch {
      // ignore
    }
  }

  return discovered;
}

// ─── 2.8: syncSkills ────────────────────────────────────────────

/**
 * 同步所有推荐 Skill（builtin 刷新 + 外部重新下载）
 * 不处理 adopted 中的用户自纳 Skill
 *
 * @param {string} lupineDir - .lupine/ 目录
 * @param {object} options - { platform, dryRun }
 */
export async function syncSkills(lupineDir, options = {}) {
  const config = readConfig(lupineDir);
  const platform = options.platform || config?.platform || 'opencode';

  log('\n📦 同步推荐 Skill...\n');

  // 1. 同步 builtin
  const builtinResults = await copyBuiltinSkills(lupineDir, platform);
  for (const r of builtinResults) {
    if (r.skipped) {
      log(`  ⏭  ${r.name}  (已存在)`);
    } else {
      log(`  ✔  ${r.name}  (已刷新)`);
    }
  }

  // 2. 同步外部推荐（重新下载）
  const recommendedList = loadRecommendedList();
  const nonBuiltinSkills = recommendedList.filter((s) => s.source !== 'builtin');
  const skillsTargetDir = resolve(lupineDir, getPlatformDir(platform), 'skills');

  for (const skill of nonBuiltinSkills) {
    const targetPath = resolve(skillsTargetDir, skill.name);

    if (options.dryRun) {
      log(`  [DRY-RUN] 将重新下载: ${skill.name} → ${targetPath}`);
      continue;
    }

    try {
      // 删除现有的
      if (existsSync(targetPath)) {
        rmSync(targetPath, { recursive: true, force: true });
      }

      const sourceInfo = parseSkillSource(skill.name);
      const tempDir = resolve(tmpdir(), `lupine-skill-${randomUUID()}`);

      try {
        const downloadedPath = await downloadSkill(sourceInfo, tempDir);
        mkdirSync(skillsTargetDir, { recursive: true });

        let copySource = downloadedPath;
        if (skill.skillPath) {
          const subDir = resolve(downloadedPath, skill.skillPath);
          if (existsSync(subDir)) copySource = subDir;
        }

        cpSync(copySource, targetPath, { recursive: true });
        log(`  ✔  ${skill.name}  (已同步)`);
      } finally {
        if (existsSync(tempDir)) {
          rmSync(tempDir, { recursive: true, force: true });
        }
      }
    } catch (e) {
      warn(`同步失败: ${skill.name} — ${e.message}`);
    }
  }

  // 更新 Agent
  const skillsConfig = readSkillsConfig(lupineDir);
  await updateAgentSkills(lupineDir, platform, skillsConfig.installed);
  log('\n  ✔  Agent 配置已更新\n');
}

// ─── 导出所有需要的内部函数供测试 ─────────────────────────────

export { parseSkillSource, validateSkill, downloadSkill, copySkillToTarget, loadRecommendedList };
