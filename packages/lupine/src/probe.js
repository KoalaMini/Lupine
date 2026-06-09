import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';

/**
 * @typedef {Object} ProbeResult
 * @property {string} path           - 原始路径
 * @property {string} lang           - "Node.js" | "Python" | "Go" | "Rust" | "Java" | "未识别"
 * @property {string} name           - 项目名称
 * @property {string} description    - 描述
 * @property {string[]} deps         - 依赖列表（仅名称）
 * @property {Record<string, string>} scripts - 可用脚本
 * @property {string} dirTree        - 格式化目录树（2-3层深度）
 * @property {boolean} ciDetected    - 是否检测到 CI 配置
 */

/**
 * ── 目录树构建 ──
 */

/** 需要跳过的目录名集合 */
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'target', '__pycache__',
  '.next', 'dist', 'build', 'venv', '.venv', 'vendor',
]);

/** 需要跳过的文件后缀集合 */
const SKIP_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot']);

/**
 * 目录树构建器
 */
class DirTreeBuilder {
  constructor(maxDepth = 3) {
    this.maxDepth = maxDepth;
  }

  /**
   * 构建目录树
   * @param {string} dirPath
   * @returns {string}
   */
  build(dirPath) {
    const lines = this._scan(dirPath, 0);
    return lines.join('\n');
  }

  /**
   * @param {string} dirPath
   * @param {number} depth
   * @returns {string[]}
   */
  _scan(dirPath, depth) {
    const lines = [];
    if (depth >= this.maxDepth) return lines;

    let entries;
    try {
      entries = readdirSync(dirPath).sort();
    } catch {
      return lines;
    }

    // 过滤
    const filtered = entries.filter((name) => {
      if (name.startsWith('.') && depth > 0) return false;
      if (SKIP_DIRS.has(name)) return false;
      const full = resolve(dirPath, name);
      try {
        if (statSync(full).isFile()) {
          const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
          if (SKIP_EXT.has(ext)) return false;
        }
      } catch {
        return false;
      }
      return true;
    });

    for (let i = 0; i < filtered.length; i++) {
      const name = filtered[i];
      const isLast = i === filtered.length - 1;
      const prefix = isLast ? '└── ' : '├── ';
      lines.push(prefix + name);

      const fullPath = resolve(dirPath, name);
      let isDir = false;
      try {
        isDir = statSync(fullPath).isDirectory();
      } catch {
        // ignore
      }

      if (isDir) {
        const children = this._scan(fullPath, depth + 1);
        for (const childLine of children) {
          lines.push((isLast ? '    ' : '│   ') + childLine);
        }
      }
    }

    return lines;
  }
}

/**
 * ── 语言检测与元数据读取 ──
 */

/**
 * 安全读取文件，失败返回 null
 * @param {string} filePath
 * @returns {string|null}
 */
function safeRead(filePath) {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * 检测单仓库语言并提取元数据
 * @param {string} repoPath - 仓库绝对路径
 * @returns {ProbeResult}
 */
export function probeRepository(repoPath) {
  // 路径不存在或不是目录 → 降级
  if (!repoPath || typeof repoPath !== 'string') {
    return createDegradedResult(repoPath || '');
  }

  try {
    if (!existsSync(repoPath) || !statSync(repoPath).isDirectory()) {
      const result = createDegradedResult(repoPath);
      result.dirTree = '';
      return result;
    }
  } catch {
    return createDegradedResult(repoPath);
  }

  // ── 按优先级检测语言 ──

  // 1. Node.js
  const pkgJsonPath = resolve(repoPath, 'package.json');
  const pkgJsonContent = safeRead(pkgJsonPath);
  if (pkgJsonContent) {
    try {
      const pkg = JSON.parse(pkgJsonContent);
      return {
        path: repoPath,
        lang: 'Node.js',
        name: pkg.name || '',
        description: pkg.description || '',
        deps: Object.keys(pkg.dependencies || {}),
        scripts: pkg.scripts || {},
        dirTree: buildDirTreeString(repoPath),
        ciDetected: detectCi(repoPath),
      };
    } catch {
      // 解析失败，不降级，继续检查其他语言
    }
  }

  // 2. Python — pyproject.toml
  const pyproject = safeRead(resolve(repoPath, 'pyproject.toml'));
  if (pyproject) {
    const { name, description, deps } = parsePyprojectToml(pyproject);
    return {
      path: repoPath,
      lang: 'Python',
      name,
      description,
      deps,
      scripts: {},
      dirTree: buildDirTreeString(repoPath),
      ciDetected: detectCi(repoPath),
    };
  }

  // 3. Python — setup.py
  if (existsSync(resolve(repoPath, 'setup.py'))) {
    const content = safeRead(resolve(repoPath, 'setup.py'));
    const deps = content ? extractSetupPyDeps(content) : [];
    return {
      path: repoPath,
      lang: 'Python',
      name: '',
      description: '',
      deps,
      scripts: {},
      dirTree: buildDirTreeString(repoPath),
      ciDetected: detectCi(repoPath),
    };
  }

  // 4. Python — requirements.txt
  const reqTxt = safeRead(resolve(repoPath, 'requirements.txt'));
  if (reqTxt) {
    const deps = reqTxt
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && !l.startsWith('-'))
      .map((l) => l.split(/[=~<>!]/)[0].trim());
    return {
      path: repoPath,
      lang: 'Python',
      name: '',
      description: '',
      deps,
      scripts: {},
      dirTree: buildDirTreeString(repoPath),
      ciDetected: detectCi(repoPath),
    };
  }

  // 5. Go
  const goMod = safeRead(resolve(repoPath, 'go.mod'));
  if (goMod) {
    const firstLine = goMod.split('\n')[0] || '';
    const match = firstLine.match(/^module\s+(\S+)/);
    const name = match ? match[1] : '';
    return {
      path: repoPath,
      lang: 'Go',
      name,
      description: '',
      deps: [],
      scripts: {},
      dirTree: buildDirTreeString(repoPath),
      ciDetected: detectCi(repoPath),
    };
  }

  // 6. Rust
  const cargoToml = safeRead(resolve(repoPath, 'Cargo.toml'));
  if (cargoToml) {
    const { name, description, deps } = parseCargoToml(cargoToml);
    return {
      path: repoPath,
      lang: 'Rust',
      name,
      description,
      deps,
      scripts: {},
      dirTree: buildDirTreeString(repoPath),
      ciDetected: detectCi(repoPath),
    };
  }

  // 7. Java — pom.xml
  const pomXml = safeRead(resolve(repoPath, 'pom.xml'));
  if (pomXml) {
    const name = extractXmlValue(pomXml, 'artifactId') || '';
    const description = extractXmlValue(pomXml, 'description') || '';
    return {
      path: repoPath,
      lang: 'Java',
      name,
      description,
      deps: [],
      scripts: {},
      dirTree: buildDirTreeString(repoPath),
      ciDetected: detectCi(repoPath),
    };
  }

  // 8. Java — build.gradle
  if (existsSync(resolve(repoPath, 'build.gradle'))) {
    return {
      path: repoPath,
      lang: 'Java',
      name: '',
      description: '',
      deps: [],
      scripts: {},
      dirTree: buildDirTreeString(repoPath),
      ciDetected: detectCi(repoPath),
    };
  }

  // 未识别 → 尝试在子目录中检测（monorepo 兼容）
  const subResult = probeSubdirectories(repoPath);
  if (subResult) {
    return {
      ...subResult,
      dirTree: buildDirTreeString(repoPath),
      ciDetected: detectCi(repoPath),
    };
  }

  // 完全未识别
  return {
    path: repoPath,
    lang: '未识别',
    name: '',
    description: '',
    deps: [],
    scripts: {},
    dirTree: buildDirTreeString(repoPath),
    ciDetected: detectCi(repoPath),
  };
}

/**
 * 多仓库探查
 * @param {string[]} repoPaths
 * @returns {Promise<ProbeResult[]>}
 */
export async function probeRepositories(repoPaths) {
  if (!Array.isArray(repoPaths) || repoPaths.length === 0) {
    return [];
  }
  return repoPaths.map((p) => probeRepository(p));
}

/**
 * 生成单个仓库的 ARCHITECTURE.md 内容
 * @param {ProbeResult} result
 * @returns {string}
 */
export function generateArchitectureMd(result) {
  const lines = [];
  lines.push(`# ${result.name || result.path.split('/').pop() || '未命名项目'}`);
  lines.push('');
  lines.push(`- **技术栈**: ${result.lang}`);
  if (result.description) lines.push(`- **描述**: ${result.description}`);
  lines.push(`- **路径**: ${result.path}`);
  lines.push(`- **CI**: ${result.ciDetected ? '已配置' : '未检测到'}`);
  lines.push('');

  if (result.deps.length > 0) {
    lines.push('## 依赖');
    lines.push('');
    result.deps.forEach((dep) => lines.push(`- ${dep}`));
    lines.push('');
  }

  if (Object.keys(result.scripts).length > 0) {
    lines.push('## 脚本');
    lines.push('');
    for (const [name, cmd] of Object.entries(result.scripts)) {
      lines.push(`- \`${name}\`: ${cmd}`);
    }
    lines.push('');
  }

  lines.push('## 目录结构');
  lines.push('');
  lines.push('```');
  lines.push(result.dirTree || '(空)');
  lines.push('```');

  return lines.join('\n');
}

/**
 * 生成多仓库合并 ARCHITECTURE.md
 * 按 REQ-4 规范的四段式结构输出
 * @param {ProbeResult[]} results
 * @returns {string}
 */
export function generateArchitectureMdForAll(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return '# 项目架构\n\n（未关联仓库）\n';
  }

  const lines = [];

  // ── 顶层标题 ──
  lines.push('# 项目架构');
  lines.push('');

  // ── 产品架构 ──
  lines.push('## 产品架构');
  lines.push('');

  const descriptions = results
    .filter((r) => r.description)
    .map((r) => r.description);

  if (descriptions.length > 0) {
    lines.push(descriptions.join('；'));
    lines.push('');
  } else {
    lines.push('（未检测到产品描述）');
    lines.push('');
  }

  // ── 技术架构 ──
  lines.push('## 技术架构');
  lines.push('');

  for (const r of results) {
    const repoName = r.name || r.path.split('/').pop() || '未命名项目';
    lines.push(`### ${repoName}`);
    lines.push('');
    lines.push(`- **技术栈**: ${r.lang}`);
    lines.push(`- **路径**: ${r.path}`);
    if (r.description) lines.push(`- **描述**: ${r.description}`);
    lines.push(`- **CI**: ${r.ciDetected ? '已配置' : '未检测到'}`);

    if (r.deps.length > 0) {
      lines.push('');
      lines.push('依赖：');
      r.deps.forEach((dep) => lines.push(`  - ${dep}`));
    }

    if (Object.keys(r.scripts).length > 0) {
      lines.push('');
      lines.push('脚本：');
      for (const [name, cmd] of Object.entries(r.scripts)) {
        lines.push(`  - \`${name}\`: ${cmd}`);
      }
    }

    lines.push('');
  }

  // ── 目录结构 ──
  lines.push('## 目录结构');
  lines.push('');

  for (const r of results) {
    const repoName = r.name || r.path.split('/').pop() || '未命名项目';
    lines.push(`### ${repoName}`);
    lines.push('');
    lines.push('```');
    lines.push(r.dirTree || '(空)');
    lines.push('```');
    lines.push('');
  }

  // ── 基础设施 ──
  lines.push('## 基础设施');
  lines.push('');

  const allScripts = {};
  for (const r of results) {
    const repoName = r.name || r.path.split('/').pop() || '未知';
    if (Object.keys(r.scripts).length > 0) {
      allScripts[repoName] = r.scripts;
    }
  }

  if (Object.keys(allScripts).length > 0) {
    for (const [repoName, scripts] of Object.entries(allScripts)) {
      for (const [name, cmd] of Object.entries(scripts)) {
        lines.push(`- \`${name}\`: ${cmd}  (${repoName})`);
      }
    }
  } else {
    lines.push('（未检测到基础设施命令）');
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * 当根目录未检测到语言时，扫描常见 monorepo 子目录（packages/* / apps/* / libs/* / modules/*）
 * @param {string} repoPath - 仓库绝对路径
 * @returns {ProbeResult|null} - 第一个匹配的子目录结果，或 null
 */
function probeSubdirectories(repoPath) {
  const subdirCandidates = ['packages', 'apps', 'libs', 'modules'];
  for (const candidate of subdirCandidates) {
    const candidatePath = resolve(repoPath, candidate);
    try {
      if (!existsSync(candidatePath) || !statSync(candidatePath).isDirectory()) continue;
      const entries = readdirSync(candidatePath);
      for (const entry of entries.sort()) {
        const subPath = resolve(candidatePath, entry);
        try {
          if (!statSync(subPath).isDirectory()) continue;
        } catch {
          continue;
        }
        const result = probeRepository(subPath);
        if (result && result.lang !== '未识别') {
          // 发现有效的子仓库，提取其语言信息（保持 path 指向源 repo 根）
          return {
            path: repoPath,
            lang: result.lang,
            name: result.name || entry,
            description: result.description,
            deps: result.deps,
            scripts: result.scripts,
            dirTree: '', // 稍后由外层覆盖
            ciDetected: false, // 稍后由外层覆盖
          };
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * ── 内部辅助函数 ──
 */

/**
 * 创建降级结果
 * @param {string} path
 * @returns {ProbeResult}
 */
function createDegradedResult(path) {
  return {
    path,
    lang: '未识别',
    name: '',
    description: '',
    deps: [],
    scripts: {},
    dirTree: '',
    ciDetected: false,
  };
}

/**
 * 构建目录树字符串
 * @param {string} dirPath
 * @returns {string}
 */
function buildDirTreeString(dirPath) {
  try {
    const builder = new DirTreeBuilder(3);
    return builder.build(dirPath);
  } catch {
    return '';
  }
}

/**
 * CI 检测
 * @param {string} repoPath
 * @returns {boolean}
 */
function detectCi(repoPath) {
  return (
    existsSync(resolve(repoPath, '.github/workflows/')) ||
    existsSync(resolve(repoPath, '.gitlab-ci.yml')) ||
    existsSync(resolve(repoPath, 'Jenkinsfile')) ||
    existsSync(resolve(repoPath, '.circleci/config.yml'))
  );
}

/**
 * 解析 pyproject.toml 的 [project] 部分（简化版，不含完整 TOML 解析器）
 * @param {string} content
 * @returns {{ name: string, description: string, deps: string[] }}
 */
function parsePyprojectToml(content) {
  const result = { name: '', description: '', deps: [] };
  const lines = content.split('\n');
  let inProject = false;
  let inDeps = false;

  for (const raw of lines) {
    const line = raw.trim();

    if (line.startsWith('[project]')) {
      inProject = true;
      inDeps = false;
      continue;
    }
    if (line.startsWith('[') && !line.startsWith('[[') && line !== '[project]') {
      if (inDeps) break; // dependencies 块结束
      inProject = false;
      inDeps = false;
      continue;
    }

    if (inProject) {
      if (line.startsWith('name = ')) {
        result.name = extractQuotedValue(line);
      } else if (line.startsWith('description = ')) {
        result.description = extractQuotedValue(line);
      } else if (line === 'dependencies = [') {
        inProject = false;
        inDeps = true;
      }
    } else if (inDeps) {
      if (line === ']') break;
      const dep = line.replace(/^["']/, '').replace(/["'],?$/, '').trim();
      if (dep) {
        // 只取包名（去掉版本约束）
        const name = dep.split(/[=~<>!\[;]/)[0].trim();
        if (name && !name.startsWith('#')) {
          result.deps.push(name);
        }
      }
    }
  }

  return result;
}

/**
 * 从 setup.py 中提取 install_requires
 * @param {string} content
 * @returns {string[]}
 */
function extractSetupPyDeps(content) {
  const deps = [];
  const match = content.match(/install_requires\s*=\s*\[([^\]]*)\]/s);
  if (match) {
    const block = match[1];
    const items = block.split('\n');
    for (const item of items) {
      const trimmed = item.trim().replace(/^['"]/, '').replace(/['"],?$/, '').trim();
      if (trimmed) {
        // 只取包名
        const name = trimmed.split(/[=~<>!\[;]/)[0].trim();
        if (name && !name.startsWith('#')) {
          deps.push(name);
        }
      }
    }
  }
  return deps;
}

/**
 * 解析 Cargo.toml（简化版）
 * @param {string} content
 * @returns {{ name: string, description: string, deps: string[] }}
 */
function parseCargoToml(content) {
  const result = { name: '', description: '', deps: [] };
  const lines = content.split('\n');
  let inPackage = false;

  for (const raw of lines) {
    const line = raw.trim();

    if (line.startsWith('[package]')) {
      inPackage = true;
      continue;
    }
    if (line.startsWith('[') && line !== '[package]') {
      if (inPackage) {
        inPackage = false;
        continue;
      }
      // [dependencies] 段
      if (line === '[dependencies]') {
        break; // 不处理具体依赖版本
      }
    }

    if (inPackage) {
      if (line.startsWith('name = ')) {
        result.name = extractQuotedValue(line);
      } else if (line.startsWith('description = ')) {
        result.description = extractQuotedValue(line);
      }
    }
  }

  return result;
}

/**
 * 从键值对行中提取引号内的值
 * @param {string} line - 如 `name = "foo"`
 * @returns {string}
 */
function extractQuotedValue(line) {
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1) return '';
  const after = line.slice(eqIdx + 1).trim();
  // 去掉引号
  return after.replace(/^["']/, '').replace(/["']$/, '').trim();
}

/**
 * 从简陋 XML 中提取指定标签的值（仅供快速读取）
 * @param {string} xml
 * @param {string} tagName
 * @returns {string|null}
 */
function extractXmlValue(xml, tagName) {
  const regex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`);
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}
