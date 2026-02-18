import pacote from 'pacote';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Define the structure of an ExB Manifest
interface ExBManifest {
  name: string;
  type: 'widget' | 'theme';
  version: string;
}

export async function installWidget(packageName: string): Promise<void> {
  const rootDir = process.cwd();
  const tempDir = path.join(os.tmpdir(), `exb-install-${Date.now()}`);
  const extensionsDir = path.join(rootDir, 'client', 'your-extensions', 'widgets');

  if (!fs.existsSync(path.join(rootDir, 'client', 'your-extensions'))) {
    console.error("Error: Run this from the ExB root folder.");
    return;
  }

  try {
    console.log(`Fetching ${packageName}...`);
    await pacote.extract(packageName, tempDir);

    const pkgContentPath = path.join(tempDir, 'package');
    const manifestPath = path.join(pkgContentPath, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      throw new Error("Invalid ExB widget: missing manifest.json");
    }

    // Using our interface for type safety
    const manifest: ExBManifest = await fs.readJson(manifestPath);
    const finalDestination = path.join(extensionsDir, manifest.name);

    if (fs.existsSync(finalDestination)) {
      await fs.remove(finalDestination);
    }

    await fs.move(pkgContentPath, finalDestination);
    console.log(`Installed ${manifest.name} successfully!`);

  } catch (err: any) {
    console.error(`Error: Failed to install widget: ${err.message}`);
  } finally {
    await fs.remove(tempDir);
  }
}