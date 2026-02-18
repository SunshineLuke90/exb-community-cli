import pacote from 'pacote';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { runNpmCi } from '../utils/npm';

// Define the structure of an ExB Manifest
interface ExBManifest {
  name: string;
  type: 'widget' | 'theme';
  version: string;
}

export interface InstallOptions {
  widgetOnly?: boolean;
}

export async function installWidget(packageName: string, options: InstallOptions = {}): Promise<void> {
  const rootDir = process.cwd();
  const tempDir = path.join(os.tmpdir(), `exb-install-${Date.now()}`);
  const extensionsDir = path.join(rootDir, 'your-extensions', 'widgets');

  if (!fs.existsSync(path.join(rootDir, 'your-extensions'))) {
    console.error("Error: Run this from the ExB client folder.");
    return;
  }

  try {
    console.log(`Fetching ${packageName}...`);
    await pacote.extract(packageName, tempDir);

    const { pkgContentPath, manifestPath } = await resolveManifest(tempDir);

    // Using our interface for type safety
    const manifest: ExBManifest = await fs.readJson(manifestPath);
    const finalDestination = path.join(extensionsDir, manifest.name);

    if (fs.existsSync(finalDestination)) {
      await fs.remove(finalDestination);
    }

    await fs.move(pkgContentPath, finalDestination);
    console.log(`Installed ${manifest.name} successfully!`);

    await runNpmCi(finalDestination, { skip: options.widgetOnly });

  } catch (err: any) {
    console.error(`Error: Failed to install widget: ${err.message}`);
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