import fs from 'fs-extra';
import path from 'path';

export interface ExBManifest {
  name?: string;
  label?: string;
  description?: string;
  author?: string;
  license?: string;
}

/**
 * Recursively find all manifest.json files under `rootDir` and return a map
 * from absolute manifest file path -> parsed ExBManifest object.
 *
 * - Skips files that cannot be parsed.
 * - Ignores node_modules and .git directories by default.
 */
export async function collectManifests(rootDir: string): Promise<Record<string, ExBManifest>> {
  const result: Record<string, ExBManifest> = {};

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      // skip common noisy folders
      if (e.name === 'node_modules' || e.name === '.git') continue;

      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
        continue;
      }

      if (e.isFile() && e.name.toLowerCase() === 'manifest.json') {
        try {
          const json = await fs.readJson(full);
          // Only include objects that have at least a name or type field (best-effort)
          if (json && typeof json === 'object') {
            const manifest: ExBManifest = {
              name: json.name,
              label: json.label,
              description: json.description,
              author: json.author,
              license: json.license
            };
            result[full] = manifest;
          }
        } catch (err) {
          // silently skip invalid JSON
        }
      }
    }
  }

  await walk(rootDir);
  return result;
}
