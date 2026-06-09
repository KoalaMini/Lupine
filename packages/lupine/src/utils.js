import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';

/**
 * 简易交互式问答（无需外部依赖）
 * @param {string} query - 问题文本
 * @param {string} [defaultValue=''] - 默认值
 * @returns {Promise<string>}
 */
export function askQuestion(query, defaultValue = '') {
  return new Promise((resolve) => {
    const rl = createInterface({ input, output });
    const defaultText = defaultValue ? ` (${defaultValue})` : '';
    rl.question(`? ${query}${defaultText}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

/**
 * 简易逐行 diff（无外部依赖，ANSI 颜色输出）
 * @param {string} oldText - 旧文本
 * @param {string} newText - 新文本
 * @returns {string} 带颜色的 diff 文本
 */
export function simpleDiff(oldText, newText) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const oldLine = i < oldLines.length ? oldLines[i] : undefined;
    const newLine = i < newLines.length ? newLines[i] : undefined;

    if (oldLine === undefined) {
      // 新增行
      result.push(`\x1b[32m+ ${newLine}\x1b[0m`);
    } else if (newLine === undefined) {
      // 删除行
      result.push(`\x1b[31m- ${oldLine}\x1b[0m`);
    } else if (oldLine !== newLine) {
      // 变化行
      result.push(`\x1b[31m- ${oldLine}\x1b[0m`);
      result.push(`\x1b[32m+ ${newLine}\x1b[0m`);
    } else {
      // 无变化
      result.push(`  ${oldLine}`);
    }
  }

  return result.join('\n');
}
