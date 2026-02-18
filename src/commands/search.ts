import https from 'https';
import pacote from 'pacote';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

interface ExBManifest {
  name: string;
  type: 'widget' | 'theme';
  version: string;
  exbVersion?: string;
  label?: string;
}

interface SearchOptions {
  keyword?: string;
  size?: number;
  githubList?: boolean;
}

interface NpmResult {
  name: string;
  version: string;
  description?: string;
}

interface ValidatedResult extends NpmResult {
  exbVersion?: string;
  label?: string;
}

const DEFAULT_KEYWORDS = ['arcgis-exb-widget', 'experience-builder-widget'];
const DEFAULT_SIZE = 15;

export async function searchWidgets(options: SearchOptions = {}): Promise<void> {
  if (options.githubList) {
    console.log('GitHub list search is not yet implemented; falling back to npm search.');
  }

  const keywords = options.keyword ? [options.keyword] : DEFAULT_KEYWORDS;
  const size = options.size ?? DEFAULT_SIZE;

  let results: NpmResult[] = [];
  try {
    results = await searchNpm(keywords, size);
  } catch (err: any) {
    console.error(`Failed to search npm: ${err.message}`);
    return;
  }

  if (!results.length) {
    console.log('No npm results found for the provided keywords.');
    return;
  }

  const validated: ValidatedResult[] = [];

  for (const pkg of results) {
    const validatedPkg = await validateExbWidget(pkg.name, pkg.version);
    if (validatedPkg) {
      validated.push({ ...pkg, ...validatedPkg });
    }
  }

  if (!validated.length) {
    console.log('No valid Experience Builder widgets found in npm search results.');
    return;
  }

  console.log(`Found ${validated.length} widget(s):`);
  validated.forEach((pkg, idx) => {
    const parts = [
      `${idx + 1}. ${pkg.name}@${pkg.version}`,
      pkg.label ? `label: ${pkg.label}` : undefined,
      pkg.exbVersion ? `exbVersion: ${pkg.exbVersion}` : undefined,
      pkg.description
    ].filter(Boolean);
    console.log(parts.join(' | '));
  });
}

async function searchNpm(keywords: string[], size: number): Promise<NpmResult[]> {
  const text = keywords.map((k) => `keywords:${k}`).join(' ');
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(text)}&size=${size}`;

  const payload = await fetchJson(url);
  if (!payload || !Array.isArray(payload.objects)) {
    return [];
  }

  return payload.objects.map((obj: any) => ({
    name: obj?.package?.name,
    version: obj?.package?.version,
    description: obj?.package?.description
  })).filter((p: NpmResult) => Boolean(p.name && p.version));
}

async function validateExbWidget(pkgName: string, pkgVersion: string): Promise<Partial<ValidatedResult> | null> {
  const tempDir = path.join(os.tmpdir(), `exb-search-${pkgName.replace('/', '-')}-${Date.now()}`);

  try {
    await pacote.extract(`${pkgName}@${pkgVersion}`, tempDir);
    const { manifestPath } = await resolveManifest(tempDir);
    const manifest: ExBManifest = await fs.readJson(manifestPath);

    if (manifest.type !== 'widget') {
      return null;
    }

    return { exbVersion: manifest.exbVersion, label: manifest.label ?? manifest.name };
  } catch (err) {
    return null;
  } finally {
    await fs.remove(tempDir);
  }
}

async function resolveManifest(tempDir: string): Promise<{ pkgContentPath: string; manifestPath: string }> {
  const directManifest = path.join(tempDir, 'manifest.json');
  const nestedManifest = path.join(tempDir, 'package', 'manifest.json');

  if (await fs.pathExists(directManifest)) {
    return { pkgContentPath: tempDir, manifestPath: directManifest };
  }

  if (await fs.pathExists(nestedManifest)) {
    return { pkgContentPath: path.join(tempDir, 'package'), manifestPath: nestedManifest };
  }

  throw new Error('Invalid ExB widget: missing manifest.json');
}

async function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'exb-community-cli' } }, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
  });
}
