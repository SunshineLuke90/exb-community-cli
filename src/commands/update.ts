import pacote from 'pacote';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import semver from 'semver';
import { runNpmCi } from '../utils/npm';

interface ExBManifest {
  name: string;
  type: 'widget' | 'theme';
  version: string;
}

export interface UpdateOptions {
  widgetOnly?: boolean;
  version?: string;
}

export async function updateWidget(packageName: string, options: UpdateOptions = {}): Promise<void> {
  const rootDir = process.cwd();
  const tempDir = path.join(os.tmpdir(), `exb-update-${Date.now()}`);
  const extensionsDir = path.join(rootDir, 'your-extensions', 'widgets');

  if (!fs.existsSync(path.join(rootDir, 'your-extensions'))) {
    console.error('Error: Run this from the ExB client folder.');
    return;
  }

  const spec = options.version ? `${packageName}@${options.version}` : packageName;

  try {
    console.log(`Fetching ${spec}...`);
    const incomingPkg = await pacote.manifest(spec);
    await pacote.extract(spec, tempDir);

    const { pkgContentPath, manifestPath: newManifestPath } = await resolveManifest(tempDir);

    const newManifest: ExBManifest = await fs.readJson(newManifestPath);
    const installedDir = path.join(extensionsDir, newManifest.name);
    const installedManifestPath = path.join(installedDir, 'manifest.json');
    const installedPkgJsonPath = path.join(installedDir, 'package.json');

    if (!(await fs.pathExists(installedManifestPath))) {
      throw new Error(`Widget ${newManifest.name} is not installed; cannot update.`);
    }

    const currentManifest: ExBManifest = await fs.readJson(installedManifestPath);
    const currentPkgJson = (await fs.pathExists(installedPkgJsonPath)) ? await fs.readJson(installedPkgJsonPath) : null;

    const currentVersionRaw = currentPkgJson?.version ?? currentManifest.version;
    const incomingVersionRaw = incomingPkg.version ?? newManifest.version;

    const currentVersion = semver.valid(currentVersionRaw);
    const incomingVersion = semver.valid(incomingVersionRaw);

    if (!currentVersion || !incomingVersion) {
      throw new Error('Unable to compare versions; expected valid semver from npm package metadata');
    }

    if (semver.eq(incomingVersion, currentVersion)) {
      throw new Error(`Widget ${newManifest.name} is already at version ${currentVersionRaw}.`);
    }

    if (semver.lte(incomingVersion, currentVersion)) {
      throw new Error(`New version ${incomingVersionRaw} is older than installed ${currentVersionRaw}.`);
    }

    await fs.remove(installedDir);
    await fs.move(pkgContentPath, installedDir);
    console.log(`Updated ${newManifest.name} to ${incomingVersionRaw}.`);

    await runNpmCi(installedDir, { skip: options.widgetOnly });

  } catch (err: any) {
    console.error(`Error: Failed to update widget: ${err.message}`);
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