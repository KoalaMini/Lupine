import { describe, it } from 'node:test';
import assert from 'node:assert';
import { main } from '../src/main.js';

describe('main module', () => {
  it('main is exported as a function', () => {
    assert.strictEqual(typeof main, 'function');
  });
});

import { existsSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

describe('init smoke', () => {
  it('init function is exported', async () => {
    const { init } = await import('../src/init.js');
    assert.strictEqual(typeof init, 'function');
  });

  it('template files list is non-empty', async () => {
    const { getTemplateFiles } = await import('../src/generate.js');
    const files = getTemplateFiles();
    assert.ok(Array.isArray(files));
    assert.ok(files.length > 0);
  });
});
