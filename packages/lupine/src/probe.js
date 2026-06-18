import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, basename } from 'node:path';

/**
 * @typedef {Object} ProbeResult
 * @property {string} path           - 原始路径
 * @property {string} lang           - "Node.js" | "Python" | "Go" | "Rust" | "Java" | "未识别"
 * @property {string} name           - 项目名称
 * @property {string} description    - 描述
 * @property {string[]} deps         - 生产依赖列表（仅名称）
 * @property {string[]} devDeps      - 开发依赖列表（仅名称）
 * @property {Record<string, string>} scripts - 可用脚本
 * @property {string} dirTree        - 格式化目录树（带文件注释，2-3层深度）
 * @property {boolean} ciDetected    - 是否检测到 CI 配置
 * @property {ProbeResult[]} [subProjects] - 子项目（前后端分离时）
 */

// ═══════════════════════════════════════════════════════════════
// 知识库：常见依赖描述映射
// ═══════════════════════════════════════════════════════════════

/** @type {Record<string, string>} */
const DEPENDENCY_DESCRIPTIONS = {
  // ── Node.js 运行时/框架 ──
  'react': 'UI 框架核心，组件化开发',
  'react-dom': 'React DOM 渲染器，负责将组件渲染到浏览器',
  'react-router-dom': '客户端路由管理，支持 SPA 页面导航与路由守卫',
  'vue': '渐进式 JavaScript 框架',
  'vue-router': 'Vue 官方路由管理器',
  'next': 'React 全栈框架，支持 SSR/SSG',
  'nuxt': 'Vue 全栈框架，支持 SSR/SSG',
  'express': 'Web 框架，提供路由、中间件、请求/响应处理',
  'koa': '下一代 Node.js Web 框架，基于 async/await',
  'fastify': '高性能 Node.js Web 框架',
  'nestjs': '企业级 Node.js 服务端框架，支持 TypeScript',
  'electron': '跨平台桌面应用框架',
  'react-native': '跨平台移动应用框架',

  // ── Python ──
  'flask': 'Web 微框架，提供路由、请求/响应处理、蓝图等核心功能',
  'flask-sqlalchemy': 'ORM 层，基于 SQLAlchemy 封装，用于数据模型定义与数据库查询',
  'flask-jwt-extended': 'JWT 认证，支持 Access Token / Refresh Token 双令牌机制',
  'flask-cors': '跨域资源共享，支持正则匹配 origins，解决前后端分离跨域问题',
  'flask-migrate': '数据库迁移工具，基于 Alembic，管理表结构变更',
  'django': '全功能 Web 框架，ORM、Admin、认证等内置',
  'fastapi': '现代高性能 Web 框架，基于 Starlette 和 Pydantic',
  'sqlalchemy': 'ORM 层，用于数据模型定义与数据库查询',
  'pydantic': '数据验证与序列化，基于 Python 类型注解',
  'celery': '分布式任务队列，用于异步任务与定时任务',
  'requests': 'HTTP 客户端，处理 API 通信',
  'httpx': '现代异步 HTTP 客户端',
  'jinja2': '模板引擎，用于服务端渲染',
  'gunicorn': 'WSGI HTTP 服务器，用于生产环境部署',
  'uvicorn': 'ASGI 服务器，支持异步应用部署',
  'psycopg2-binary': 'PostgreSQL 数据库适配器，Python 连接 PostgreSQL 的驱动',
  'pymongo': 'MongoDB 数据库驱动',
  'redis': 'Redis 客户端',
  'pillow': '图像处理库',
  'numpy': '科学计算基础库',
  'pandas': '数据分析与处理库',
  'python-dotenv': '环境变量管理，支持多环境（开发/测试/生产）配置加载',
  'email-validator': '邮箱格式校验，用于用户注册等场景',
  'cryptography': '加密库，用于密钥交换与数据加密',

  // ── 数据库/ORM ──
  'prisma': '现代数据库 ORM，支持类型安全查询',
  'mongoose': 'MongoDB 对象建模库',
  'sequelize': 'Node.js 多数据库 ORM',
  'typeorm': 'TypeScript ORM，支持装饰器',
  'drizzle-orm': '类型安全的轻量级 ORM',

  // ── 认证/安全 ──
  'jsonwebtoken': 'JWT 令牌生成与验证',
  'passport': 'Node.js 认证中间件，支持多种策略',
  'bcrypt': '密码哈希加密',
  'argon2': '现代密码哈希算法',
  'cors': '跨域资源共享中间件',
  'helmet': '安全 HTTP 响应头中间件',
  'flask-jwt-extended': 'JWT 认证，支持 Access/Refresh Token 双令牌',
  'flask-cors': '跨域资源共享，支持正则匹配 origins',
  'flask-migrate': '数据库迁移工具，基于 Alembic',

  // ── 构建/开发工具 ──
  'typescript': 'TypeScript 编译器，提供静态类型检查',
  'vite': '前端构建工具，支持热更新、代码分割、Tree Shaking',
  'webpack': '模块打包工具',
  'rollup': 'JavaScript 模块打包器',
  'esbuild': '极速 JavaScript 打包工具',
  'tsc': 'TypeScript 编译器',
  'ts-node': '直接运行 TypeScript 文件',
  'nodemon': '开发服务器，文件变更自动重启',
  'pm2': 'Node.js 进程管理器，用于生产环境部署',
  'eslint': '代码质量检查工具',
  'prettier': '代码格式化工具',

  // ── 测试 ──
  'jest': 'JavaScript 测试框架，支持快照测试',
  'vitest': '单元测试框架，兼容 Jest API，支持 Vite 生态',
  'mocha': 'JavaScript 测试框架',
  'chai': '断言库',
  'cypress': 'E2E 端到端测试框架',
  'playwright': 'E2E 端到端测试框架，支持多浏览器',
  '@playwright/test': 'Playwright 测试框架',
  'pytest': 'Python 测试框架，支持单元测试与集成测试',
  'pytest-flask': 'pytest 的 Flask 插件',

  // ── UI/组件 ──
  '@mui/material': 'Material Design React 组件库',
  'antd': 'Ant Design React 组件库',
  '@chatui/core': '聊天界面核心组件库',
  'tailwindcss': '原子化 CSS 框架',
  'styled-components': 'CSS-in-JS 样式解决方案',
  'sass': 'CSS 预处理器',
  'less': 'CSS 预处理器',
  'lucide-react': '图标库，提供各类 SVG 图标组件',

  // ── HTTP/通信 ──
  'axios': 'HTTP 客户端，处理前后端 API 通信',
  'fetch': '原生 HTTP 客户端 API',
  'graphql': '查询语言与运行时',
  'apollo-client': 'GraphQL 客户端',
  'trpc': '端到端类型安全 API',
  'socket.io': '实时双向通信库',
  'ws': 'WebSocket 实现',

  // ── 状态管理 ──
  'redux': 'JavaScript 状态管理容器',
  '@reduxjs/toolkit': 'Redux 官方工具集',
  'zustand': '轻量级状态管理库',
  'mobx': '响应式状态管理',
  'recoil': 'React 状态管理库',
  'pinia': 'Vue 官方状态管理库',

  // ── 工具/其他 ──
  'lodash': 'JavaScript 工具函数库',
  'dayjs': '轻量级日期处理库',
  'date-fns': '函数式日期处理库',
  'commander': 'CLI 命令解析框架，支持子命令、选项、参数解析',
  'chalk': '终端字符串样式输出',
  'inquirer': '交互式命令行提示',
  'ora': '终端加载动画',
  'dotenv': '环境变量管理，支持多环境配置加载',
  'zod': 'TypeScript 模式验证与类型推断',
  'joi': 'JavaScript 对象模式描述与验证',
  'class-validator': '基于装饰器的对象验证',

  // ── 浏览器/运行时 ──
  '@sqlite.org/sqlite-wasm': '浏览器端 SQLite（WebAssembly），OPFS 持久化 + FTS5 全文搜索',
  'rc-drawer': '抽屉组件，用于设置页、侧边栏等滑出面板',
  'device-detector-js': '设备检测库，解析 User-Agent 识别设备类型与浏览器',
};

// ═══════════════════════════════════════════════════════════════
// 知识库：常见文件/目录注释映射
// ═══════════════════════════════════════════════════════════════

/** @type {Record<string, string>} */
const FILE_DESCRIPTIONS = {
  // ── 配置文件 ──
  'package.json': '项目配置、依赖管理与脚本定义',
  'tsconfig.json': 'TypeScript 编译器配置',
  'vite.config.ts': 'Vite 构建工具配置',
  'vite.config.js': 'Vite 构建工具配置',
  'webpack.config.js': 'Webpack 打包配置',
  'rollup.config.js': 'Rollup 打包配置',
  'eslint.config.js': 'ESLint 代码规范配置',
  '.eslintrc.js': 'ESLint 代码规范配置',
  '.prettierrc': 'Prettier 代码格式化配置',
  'tailwind.config.js': 'Tailwind CSS 配置',
  'tailwind.config.ts': 'Tailwind CSS 配置',
  'postcss.config.js': 'PostCSS 配置',
  'babel.config.js': 'Babel 转译配置',
  'jest.config.js': 'Jest 测试配置',
  'vitest.config.ts': 'Vitest 测试配置',
  'vitest.config.js': 'Vitest 测试配置',
  'playwright.config.ts': 'Playwright E2E 测试配置',
  'dockerfile': 'Docker 容器镜像构建配置',
  'docker-compose.yml': 'Docker 多服务编排配置',
  '.gitignore': 'Git 忽略规则配置',
  '.env': '环境变量配置（本地开发）',
  '.env.example': '环境变量模板文件',
  'README.md': '项目介绍与使用说明',
  'CHANGELOG.md': '版本变更记录',
  'LICENSE': '开源许可证',

  // ── Python ──
  'pyproject.toml': 'Python 项目配置与依赖管理',
  'setup.py': 'Python 包安装配置',
  'requirements.txt': 'Python 依赖清单',
  'requirements-dev.txt': 'Python 开发依赖清单',
  'Pipfile': 'Pipenv 依赖管理配置',
  'tox.ini': '多环境测试配置',
  'pytest.ini': 'pytest 测试配置',
  'manage.py': 'Django 项目管理命令入口',

  // ── Go ──
  'go.mod': 'Go 模块依赖管理',
  'go.sum': 'Go 模块校验和',
  'main.go': 'Go 程序入口文件',

  // ── Rust ──
  'Cargo.toml': 'Rust 项目配置与依赖管理',
  'Cargo.lock': 'Rust 依赖锁定文件',
  'main.rs': 'Rust 程序入口',
  'lib.rs': 'Rust 库入口',

  // ── Java ──
  'pom.xml': 'Maven 项目配置',
  'build.gradle': 'Gradle 构建配置',
  'gradlew': 'Gradle Wrapper 脚本',

  // ── 目录 ──
  'src': '源代码目录',
  'source': '源代码目录',
  'app': '应用代码目录',
  'lib': '库代码目录',
  'libs': '库目录',
  'dist': '构建输出目录',
  'build': '构建输出目录',
  'out': '输出目录',
  'public': '静态资源目录（直接服务）',
  'static': '静态资源目录',
  'assets': '静态资源目录',
  'images': '图片资源目录',
  'styles': '样式文件目录',
  'css': 'CSS 样式目录',
  'scss': 'SCSS 样式目录',
  'components': 'UI 组件目录',
  'pages': '页面组件目录',
  'views': '视图层目录',
  'routes': '路由定义目录',
  'controllers': '控制器层目录',
  'models': '数据模型目录',
  'services': '业务逻辑/服务层目录',
  'utils': '工具函数目录',
  'helpers': '辅助函数目录',
  'hooks': 'React/Vue 自定义 Hooks',
  'context': 'React Context 状态管理',
  'stores': '状态管理目录',
  'types': 'TypeScript 类型定义目录',
  'interfaces': '接口定义目录',
  'tests': '测试文件目录',
  'test': '测试文件目录',
  '__tests__': '测试文件目录',
  'e2e': '端到端测试目录',
  'specs': '测试规格目录',
  'docs': '文档目录',
  'scripts': '脚本工具目录',
  'bin': '可执行脚本目录',
  'cmd': '命令行入口目录',
  'config': '配置文件目录',
  'configs': '配置文件目录',
  'settings': '配置文件目录',
  'env': '环境配置目录',
  'environments': '环境配置目录',
  'migrations': '数据库迁移文件目录',
  'seeds': '数据库种子数据目录',
  'templates': '模板文件目录',
  'locale': '国际化/本地化目录',
  'locales': '国际化/本地化目录',
  'i18n': '国际化配置目录',
  'middleware': '中间件目录',
  'plugins': '插件目录',
  'modules': '模块目录',
  'packages': 'Monorepo 子包目录',
  'workspaces': '工作区目录',
  '.github': 'GitHub 配置（Actions、Issue 模板等）',
  '.vscode': 'VS Code 编辑器配置',
  '.husky': 'Git Hooks 配置',
  'coverage': '测试覆盖率报告目录',
  'node_modules': '依赖包目录（.gitignore）',
  'vendor': '第三方依赖目录',
  'third_party': '第三方代码目录',
};

// ═══════════════════════════════════════════════════════════════
// 目录树构建器（带注释）
// ═══════════════════════════════════════════════════════════════

/** 需要跳过的目录名集合 */
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'target', '__pycache__',
  '.next', 'dist', 'build', 'venv', '.venv', 'vendor',
  'coverage', '.husky', '.vscode', '.idea',
]);

/** 需要跳过的文件后缀集合 */
const SKIP_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4',
  '.mov', '.avi', '.zip', '.tar', '.gz', '.rar',
  '.exe', '.dll', '.so', '.dylib', '.class',
  '.pyc', '.pyo', '.o', '.a',
]);

/**
 * 目录树构建器（带文件注释）
 */
class DirTreeBuilder {
  constructor(maxDepth = 3) {
    this.maxDepth = maxDepth;
  }

  /**
   * 构建带注释的目录树
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

      // 获取注释
      const fullPath = resolve(dirPath, name);
      let isDir = false;
      try {
        isDir = statSync(fullPath).isDirectory();
      } catch {
        // ignore
      }
      const comment = getFileComment(name, isDir);
      const line = comment ? `${name}  # ${comment}` : name;
      lines.push(prefix + line);

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
 * 获取文件或目录的注释说明
 * @param {string} name
 * @param {boolean} isDir
 * @returns {string}
 */
function getFileComment(name, isDir) {
  const lowerName = name.toLowerCase();

  // 直接匹配（最精确）
  if (FILE_DESCRIPTIONS[lowerName]) {
    return FILE_DESCRIPTIONS[lowerName];
  }

  // 目录：尝试去掉扩展名匹配目录名
  if (isDir) {
    const withoutExt = lowerName.replace(/\.[^.]+$/, '');
    if (FILE_DESCRIPTIONS[withoutExt]) {
      return FILE_DESCRIPTIONS[withoutExt];
    }
  }

  // 文件：只匹配完整文件名或扩展名映射
  if (!isDir) {
    // 按文件类型匹配
    if (lowerName.endsWith('.config.js') || lowerName.endsWith('.config.ts')) {
      return '工具配置文件';
    }
    if (lowerName.endsWith('.test.js') || lowerName.endsWith('.test.ts') ||
        lowerName.endsWith('.spec.js') || lowerName.endsWith('.spec.ts')) {
      return '测试文件';
    }
  }

  return '';
}

// ═══════════════════════════════════════════════════════════════
// 语言检测与元数据读取
// ═══════════════════════════════════════════════════════════════

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
 * 解析 package.json，返回结构化数据
 * @param {string} content
 * @returns {{name: string, description: string, deps: string[], devDeps: string[], scripts: Record<string, string>}}
 */
function parsePackageJson(content) {
  try {
    const pkg = JSON.parse(content);
    return {
      name: pkg.name || '',
      description: pkg.description || '',
      deps: Object.keys(pkg.dependencies || {}),
      devDeps: Object.keys(pkg.devDependencies || {}),
      scripts: pkg.scripts || {},
    };
  } catch {
    return { name: '', description: '', deps: [], devDeps: [], scripts: {} };
  }
}

/**
 * 探测仓库结构（支持前后端分离）
 * @param {string} repoPath
 * @returns {{isMonorepo: boolean, hasFrontend: boolean, hasBackend: boolean, subDirs: string[]}}
 */
function detectStructure(repoPath) {
  const result = {
    isMonorepo: false,
    hasFrontend: false,
    hasBackend: false,
    subDirs: [],
  };

  try {
    const entries = readdirSync(repoPath);
    const dirs = entries.filter((e) => {
      const p = resolve(repoPath, e);
      try {
        return statSync(p).isDirectory() && !SKIP_DIRS.has(e) && !e.startsWith('.');
      } catch {
        return false;
      }
    });

    // 检测常见前后端目录名
    const frontendPatterns = ['frontend', 'client', 'web', 'ui', 'app-frontend', 'www'];
    const backendPatterns = ['backend', 'server', 'api', 'app-backend', 'services'];

    result.hasFrontend = dirs.some((d) => frontendPatterns.includes(d.toLowerCase()));
    result.hasBackend = dirs.some((d) => backendPatterns.includes(d.toLowerCase()));

    // 检测 monorepo
    const monorepoIndicators = ['packages', 'apps', 'workspaces', 'libs', 'modules'];
    result.isMonorepo = dirs.some((d) => monorepoIndicators.includes(d.toLowerCase()));

    result.subDirs = dirs;
  } catch {
    // ignore
  }

  return result;
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

  // 先检测整体结构
  const structure = detectStructure(repoPath);

  // ── 按优先级检测语言 ──

  // 1. Node.js
  const pkgJsonPath = resolve(repoPath, 'package.json');
  const pkgJsonContent = safeRead(pkgJsonPath);
  if (pkgJsonContent) {
    const parsed = parsePackageJson(pkgJsonContent);

    // 检测是否有子项目（前后端分离）
    const subProjects = [];
    if (structure.hasFrontend || structure.hasBackend || structure.isMonorepo) {
      const candidates = structure.subDirs.filter((d) => {
        const dLower = d.toLowerCase();
        return ['frontend', 'client', 'web', 'ui', 'backend', 'server', 'api', 'packages', 'apps', 'services'].includes(dLower);
      });

      for (const subDir of candidates) {
        const subPath = resolve(repoPath, subDir);
        const subResult = probeRepository(subPath);
        if (subResult.lang !== '未识别') {
          subProjects.push(subResult);
        }
      }
    }

    return {
      path: repoPath,
      lang: 'Node.js',
      name: parsed.name,
      description: parsed.description,
      deps: parsed.deps,
      devDeps: parsed.devDeps,
      scripts: parsed.scripts,
      dirTree: buildDirTreeString(repoPath),
      ciDetected: detectCi(repoPath),
      subProjects: subProjects.length > 0 ? subProjects : undefined,
    };
  }

  // 2. Python — pyproject.toml
  const pyproject = safeRead(resolve(repoPath, 'pyproject.toml'));
  if (pyproject) {
    const { name, description, deps, devDeps } = parsePyprojectToml(pyproject);
    return {
      path: repoPath,
      lang: 'Python',
      name,
      description,
      deps,
      devDeps,
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
      devDeps: [],
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

    // 检测是否有 requirements-dev.txt
    const devReqTxt = safeRead(resolve(repoPath, 'requirements-dev.txt'));
    const devDeps = devReqTxt
      ? devReqTxt
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#') && !l.startsWith('-'))
          .map((l) => l.split(/[=~<>!]/)[0].trim())
      : [];

    return {
      path: repoPath,
      lang: 'Python',
      name: '',
      description: '',
      deps,
      devDeps: devDeps,
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
      devDeps: [],
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
      devDeps: [],
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
      devDeps: [],
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
      devDeps: [],
      scripts: {},
      dirTree: buildDirTreeString(repoPath),
      ciDetected: detectCi(repoPath),
    };
  }

  // 未识别 → 尝试在子目录中检测（monorepo / 前后端分离兼容）
  const subResult = probeSubdirectories(repoPath);
  if (subResult) {
    const result = {
      ...subResult,
      dirTree: buildDirTreeString(repoPath),
      ciDetected: detectCi(repoPath),
    };

    // 如果有前后端子项目，提取到 subProjects
    if (subResult._subProjects) {
      result.subProjects = subResult._subProjects;
      delete result._subProjects;
    }

    return result;
  }

  // 完全未识别
  return {
    path: repoPath,
    lang: '未识别',
    name: '',
    description: '',
    deps: [],
    devDeps: [],
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

// ═══════════════════════════════════════════════════════════════
// 生成 ARCHITECTURE.md（新格式）
// ═══════════════════════════════════════════════════════════════

/**
 * 为单个依赖生成带描述的表格行
 * @param {string} dep
 * @returns {string}
 */
function formatDepRow(dep) {
  // 优先精确匹配
  let desc = DEPENDENCY_DESCRIPTIONS[dep];

  // 如果没有精确匹配，尝试去掉 scope 匹配（但要避免 @types/xxx 匹配到 xxx）
  if (!desc && dep.startsWith('@')) {
    // @types/react → 不降级匹配 react，保持未知
    if (dep.startsWith('@types/')) {
      desc = 'TypeScript 类型定义文件';
    } else {
      // 其他 @scope/pkg → 尝试匹配 pkg
      const pkgName = dep.split('/').pop();
      desc = DEPENDENCY_DESCRIPTIONS[pkgName];
    }
  }

  return desc
    ? `| **${dep}** | ${desc} |`
    : `| ${dep} | — |`;
}

/**
 * 生成依赖表格
 * @param {string[]} deps
 * @param {string} title
 * @returns {string}
 */
function generateDepTable(deps, title) {
  if (!deps || deps.length === 0) return '';

  const lines = [];
  lines.push(`#### ${title}`);
  lines.push('');
  lines.push('| 依赖库 | 作用 |');
  lines.push('|--------|------|');

  for (const dep of deps) {
    lines.push(formatDepRow(dep));
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * 生成技术栈部分
 * @param {ProbeResult} result
 * @returns {string}
 */
function generateTechStack(result) {
  const lines = [];
  lines.push('## 技术架构');
  lines.push('');

  // 有子项目（前后端分离）
  if (result.subProjects && result.subProjects.length > 0) {
    for (const sub of result.subProjects) {
      const subName = sub.name || basename(sub.path);
      const role = detectSubProjectRole(sub.path);
      lines.push(`### ${role}（${sub.lang}）`);
      lines.push('');

      if (sub.lang === 'Node.js') {
        lines.push(generateDepTable(sub.deps, '运行时依赖'));
        lines.push(generateDepTable(sub.devDeps, '开发依赖'));
      } else {
        lines.push(generateDepTable(sub.deps, '核心依赖'));
        lines.push(generateDepTable(sub.devDeps, '开发依赖'));
      }
    }

    // 前后端通信说明
    const frontend = result.subProjects.find((s) => detectSubProjectRole(s.path).includes('前端'));
    const backend = result.subProjects.find((s) => detectSubProjectRole(s.path).includes('后端'));

    if (frontend && backend) {
      lines.push('### 前后端通信');
      lines.push('');
      lines.push('| 项目 | 说明 |');
      lines.push('|------|------|');

      // 推断通信方式
      const hasApi = frontend.deps.some((d) => ['axios', 'fetch', 'graphql', 'apollo-client', 'trpc'].includes(d));
      const hasRest = backend.deps.some((d) => ['express', 'fastify', 'flask', 'django', 'fastapi'].includes(d));
      const hasWebSocket = frontend.deps.includes('socket.io') || backend.deps.includes('socket.io');

      if (hasApi) {
        lines.push('| **API 格式** | RESTful JSON |');
      }
      if (hasWebSocket) {
        lines.push('| **实时通信** | WebSocket（Socket.IO） |');
      }
      if (frontend.deps.includes('graphql') || backend.deps.includes('graphql')) {
        lines.push('| **API 格式** | GraphQL |');
      }

      lines.push('');
    }
  } else {
    // 单一项目
    lines.push(`### ${result.lang}`);
    lines.push('');

    if (result.lang === 'Node.js') {
      lines.push(generateDepTable(result.deps, '核心依赖'));
      lines.push(generateDepTable(result.devDeps, '开发依赖'));
    } else if (result.lang === 'Python') {
      lines.push(generateDepTable(result.deps, '核心依赖'));
      lines.push(generateDepTable(result.devDeps, '开发依赖'));
    } else {
      lines.push(generateDepTable(result.deps, '核心依赖'));
    }
  }

  // 基础设施
  if (Object.keys(result.scripts).length > 0 || result.ciDetected) {
    lines.push('### 基础设施');
    lines.push('');
    lines.push('| 项目 | 说明 |');
    lines.push('|------|------|');

    for (const [name, cmd] of Object.entries(result.scripts)) {
      const desc = inferScriptDesc(name, cmd);
      lines.push(`| **\`${name}\`** | ${desc} |`);
    }

    if (result.ciDetected) {
      lines.push('| **CI/CD** | GitHub Actions / GitLab CI / Jenkins（已配置） |');
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 检测子项目角色（前端/后端）
 * @param {string} path
 * @returns {string}
 */
function detectSubProjectRole(path) {
  const name = basename(path).toLowerCase();
  const frontendPatterns = ['frontend', 'client', 'web', 'ui', 'www'];
  const backendPatterns = ['backend', 'server', 'api'];

  if (frontendPatterns.some((p) => name.includes(p))) return '前端';
  if (backendPatterns.some((p) => name.includes(p))) return '后端';
  return '服务';
}

/**
 * 推断脚本用途描述
 * @param {string} name
 * @param {string} cmd
 * @returns {string}
 */
function inferScriptDesc(name, cmd) {
  const descs = {
    'dev': '启动本地开发服务器',
    'start': '启动生产服务器',
    'build': '构建生产包',
    'test': '运行测试',
    'test:unit': '运行单元测试',
    'test:e2e': '运行端到端测试',
    'lint': '运行代码规范检查',
    'lint:fix': '自动修复代码规范问题',
    'format': '格式化代码',
    'typecheck': 'TypeScript 类型检查',
    'preview': '预览生产构建',
    'deploy': '部署到生产环境',
    'release': '发布新版本',
    'clean': '清理构建产物',
  };

  return descs[name] || cmd;
}

/**
 * 生成单个仓库的 ARCHITECTURE.md 内容（新格式）
 * @param {ProbeResult} result
 * @returns {string}
 */
export function generateArchitectureMd(result) {
  const lines = [];

  // 标题
  const title = result.name || basename(result.path) || '未命名项目';
  lines.push(`# ${title}`);
  lines.push('');

  // 产品架构
  lines.push('## 产品架构');
  lines.push('');
  lines.push(result.description || '（未检测到产品描述）');
  lines.push('');

  // 技术架构
  lines.push(generateTechStack(result));

  // 目录结构
  lines.push('## 目录结构');
  lines.push('');
  lines.push('```');
  lines.push(result.dirTree || '(空)');
  lines.push('```');

  return lines.join('\n');
}

/**
 * 生成多仓库合并 ARCHITECTURE.md（新格式）
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
    const repoName = r.name || basename(r.path) || '未命名项目';
    lines.push(`### ${repoName}`);
    lines.push('');

    // 有子项目
    if (r.subProjects && r.subProjects.length > 0) {
      for (const sub of r.subProjects) {
        const role = detectSubProjectRole(sub.path);
        lines.push(`#### ${role}（${sub.lang}）`);
        lines.push('');

        if (sub.lang === 'Node.js') {
          const depTable = generateDepTable(sub.deps, '核心依赖');
          if (depTable) lines.push(depTable);
          const devDepTable = generateDepTable(sub.devDeps, '开发依赖');
          if (devDepTable) lines.push(devDepTable);
        } else {
          const depTable = generateDepTable(sub.deps, '核心依赖');
          if (depTable) lines.push(depTable);
        }
      }

      // 前后端通信
      const frontend = r.subProjects.find((s) => detectSubProjectRole(s.path).includes('前端'));
      const backend = r.subProjects.find((s) => detectSubProjectRole(s.path).includes('后端'));

      if (frontend && backend) {
        lines.push('#### 前后端通信');
        lines.push('');
        lines.push('| 项目 | 说明 |');
        lines.push('|------|------|');

        const hasApi = frontend.deps.some((d) => ['axios', 'fetch', 'graphql', 'apollo-client'].includes(d));
        const hasWebSocket = frontend.deps.includes('socket.io') || backend.deps.includes('socket.io');

        if (hasApi) lines.push('| **API 格式** | RESTful JSON |');
        if (hasWebSocket) lines.push('| **实时通信** | WebSocket（Socket.IO） |');
        if (frontend.deps.includes('graphql')) lines.push('| **API 格式** | GraphQL |');

        lines.push('');
      }
    } else {
      // 单一项目
      lines.push(`- **技术栈**: ${r.lang}`);
      lines.push(`- **路径**: ${r.path}`);
      if (r.description) lines.push(`- **描述**: ${r.description}`);
      lines.push(`- **CI**: ${r.ciDetected ? '已配置' : '未检测到'}`);

      if (r.lang === 'Node.js') {
        const depTable = generateDepTable(r.deps, '核心依赖');
        if (depTable) {
          lines.push('');
          lines.push(depTable);
        }
        const devDepTable = generateDepTable(r.devDeps, '开发依赖');
        if (devDepTable) {
          lines.push(devDepTable);
        }
      } else {
        const depTable = generateDepTable(r.deps, '核心依赖');
        if (depTable) {
          lines.push('');
          lines.push(depTable);
        }
      }
    }

    lines.push('');
  }

  // ── 目录结构 ──
  lines.push('## 目录结构');
  lines.push('');

  for (const r of results) {
    const repoName = r.name || basename(r.path) || '未命名项目';
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
    const repoName = r.name || basename(r.path) || '未知';
    if (Object.keys(r.scripts).length > 0) {
      allScripts[repoName] = r.scripts;
    }
  }

  if (Object.keys(allScripts).length > 0) {
    for (const [repoName, scripts] of Object.entries(allScripts)) {
      for (const [name, cmd] of Object.entries(scripts)) {
        const desc = inferScriptDesc(name, cmd);
        lines.push(`- **\`${name}\`**（${repoName}）: ${desc}`);
      }
    }
  } else {
    lines.push('（未检测到基础设施命令）');
  }
  lines.push('');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// 内部辅助函数
// ═══════════════════════════════════════════════════════════════

/**
 * 当根目录未检测到语言时，扫描常见 monorepo 子目录
 * @param {string} repoPath - 仓库绝对路径
 * @returns {ProbeResult|null} - 第一个匹配的子目录结果，或 null
 */
function probeSubdirectories(repoPath) {
  // 第一优先级：标准 monorepo 目录
  const monorepoCandidates = ['packages', 'apps', 'libs', 'modules'];
  for (const candidate of monorepoCandidates) {
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
          return {
            path: repoPath,
            lang: result.lang,
            name: result.name || entry,
            description: result.description,
            deps: result.deps,
            devDeps: result.devDeps || [],
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

  // 第二优先级：前后端分离目录（frontend/backend/client/server 等）
  const febeCandidates = ['frontend', 'client', 'web', 'ui', 'backend', 'server', 'api'];
  const subProjects = [];

  for (const candidate of febeCandidates) {
    const candidatePath = resolve(repoPath, candidate);
    try {
      if (!existsSync(candidatePath) || !statSync(candidatePath).isDirectory()) continue;
      const result = probeRepository(candidatePath);
      if (result && result.lang !== '未识别') {
        subProjects.push(result);
      }
    } catch {
      continue;
    }
  }

  if (subProjects.length > 0) {
    // 返回第一个子项目的语言作为整体语言，但保留子项目列表给上层处理
    const first = subProjects[0];
    return {
      path: repoPath,
      lang: first.lang,
      name: first.name || basename(repoPath),
      description: first.description,
      deps: first.deps,
      devDeps: first.devDeps || [],
      scripts: first.scripts,
      dirTree: '', // 稍后由外层覆盖
      ciDetected: false, // 稍后由外层覆盖
      _subProjects: subProjects, // 内部标记，给 probeRepository 提取
    };
  }

  return null;
}

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
    devDeps: [],
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
 * @returns {{ name: string, description: string, deps: string[], devDeps: string[] }}
 */
function parsePyprojectToml(content) {
  const result = { name: '', description: '', deps: [], devDeps: [] };
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
      if (inDeps) break;
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
      if (line === '[dependencies]') {
        break;
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
