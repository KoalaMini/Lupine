import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, '../templates');

/**
 * 获取 templates 目录的绝对路径
 */
export function getTemplatesDir() {
  return TEMPLATES_DIR;
}

/**
 * 替换字符串中的占位符
 * @param {string} content - 模板内容
 * @param {object} variables - { projectName: 'xxx' }
 * @returns {string}
 */
export function replacePlaceholders(content, variables) {
  let result = content;
  if (variables.projectName) {
    result = result.replace(/\{project_name\}/g, variables.projectName);
  }
  return result;
}

/**
 * 生成文件：读取模板 → 替换占位符 → 写入目标
 * @param {string} templateRelPath - 模板相对路径 (e.g., "AGENT.md")
 * @param {string} targetAbsPath - 目标绝对路径
 * @param {object} variables - 占位符变量
 */
/**
 * 模板文件名到目标文件名的映射
 * 用于处理 npm 会忽略的特殊文件名（如 .gitignore）
 * key: 模板文件名（磁盘上的实际文件名）
 * value: 目标文件名（生成到 .lupine/ 中的文件名）
 */
export const TEMPLATE_NAME_MAP = {
  'gitignore': '.gitignore',
};

export function generateFile(templateRelPath, targetAbsPath, variables) {
  const templatePath = join(TEMPLATES_DIR, templateRelPath);

  if (!existsSync(templatePath)) {
    throw new Error(`模板文件不存在: ${templatePath}`);
  }

  // 读取
  let content = readFileSync(templatePath, 'utf-8');

  // 替换
  content = replacePlaceholders(content, variables);

  // 确保目标目录存在
  mkdirSync(dirname(targetAbsPath), { recursive: true });

  // 写入
  writeFileSync(targetAbsPath, content, 'utf-8');

  return content;
}

/**
 * 获取模板清单（文件名列表）
 * @returns {string[]} 相对路径数组
 */
export function getTemplateFiles() {
  // 模板文件清单，按写入顺序排列
  // 注意：npm 默认会忽略 .gitignore 文件，因此模板中使用 'gitignore'（无点号）
  // 在 generateFile 中会映射为 '.gitignore'
  return [
    'AGENT.md',
    'PRODUCT.md',
    'README.md',
    'gitignore',
    '.lupineconfig.json',
    'rules/coding.md',
  ];
}
