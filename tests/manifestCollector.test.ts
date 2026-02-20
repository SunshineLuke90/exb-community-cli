import { collectManifests } from '../src/utils/manifestCollector';
import fs from 'fs-extra';
import path from 'path';

describe('collectManifests', () => {
  const tmpRoot = path.join(__dirname, 'tmp-manifests');

  beforeAll(async () => {
    await fs.remove(tmpRoot);
    await fs.ensureDir(tmpRoot);

    // widget A
    const wa = path.join(tmpRoot, 'widgets', 'a');
    await fs.ensureDir(wa);
    await fs.writeJson(path.join(wa, 'manifest.json'), { name: 'widget-a', label: 'Widget A', description: 'A' });

    // nested widget B
    const wb = path.join(tmpRoot, 'some', 'deep', 'widgets', 'b');
    await fs.ensureDir(wb);
    await fs.writeJson(path.join(wb, 'manifest.json'), { name: 'widget-b', label: 'Widget B', description: 'B' });

    // a malformed JSON file should be ignored
    const bad = path.join(tmpRoot, 'bad');
    await fs.ensureDir(bad);
    await fs.writeFile(path.join(bad, 'manifest.json'), '{ not valid json');

    // node_modules should be ignored
    const nm = path.join(tmpRoot, 'node_modules', 'pkg');
    await fs.ensureDir(nm);
    await fs.writeJson(path.join(nm, 'manifest.json'), { name: 'pkg', label: 'Should be ignored' });
  });

  afterAll(async () => {
    await fs.remove(tmpRoot);
  });

  test('finds manifest.json files and returns map', async () => {
    const map = await collectManifests(tmpRoot);
    const keys = Object.keys(map);
    expect(keys.length).toBe(2);
    const labels = Object.values(map).map((m) => m.label).sort();
    expect(labels).toEqual(['Widget A', 'Widget B']);
  });
});
