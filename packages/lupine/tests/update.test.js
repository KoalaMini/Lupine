import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compareVersions, getLocalVersion, checkNpmLatestVersion } from '../src/update.js';

describe('update version helpers', () => {
  it('compareVersions identifies equal versions', () => {
    assert.strictEqual(compareVersions('1.0.0', '1.0.0'), 0);
    assert.strictEqual(compareVersions('v1.0.0', '1.0.0'), 0);
  });

  it('compareVersions identifies newer versions', () => {
    assert.strictEqual(compareVersions('1.0.0', '1.1.0'), -1);
    assert.strictEqual(compareVersions('1.0.0', '2.0.0'), -1);
    assert.strictEqual(compareVersions('0.9.0', '1.0.0'), -1);
  });

  it('compareVersions identifies older versions', () => {
    assert.strictEqual(compareVersions('1.1.0', '1.0.0'), 1);
    assert.strictEqual(compareVersions('2.0.0', '1.0.0'), 1);
  });

  it('getLocalVersion returns a valid semver', () => {
    const v = getLocalVersion();
    assert.match(v, /^\d+\.\d+\.\d+/);
  });

  it('checkNpmLatestVersion returns a structured result', async () => {
    const result = await checkNpmLatestVersion();
    assert.strictEqual(typeof result, 'object');
    assert.ok('latest' in result);
    assert.ok('ok' in result);
    assert.strictEqual(typeof result.latest, 'string');
    assert.strictEqual(typeof result.ok, 'boolean');
    if (result.ok) {
      assert.match(result.latest, /^\d+\.\d+\.\d+/);
    }
  });
});
