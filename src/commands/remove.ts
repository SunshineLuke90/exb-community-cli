import fs from 'fs-extra';
import path from 'path';

// write a command that removes an installed widget by name, optionally the npm name, or the name defined in the manifest. It should also have a --force option that skips the confirmation prompt.

interface ExBManifest {
  name: string;
  type: 'widget' | 'theme';
  version: string;
}

interface NpmResult {
  name: string;
  version: string;
  description?: string;
}

export interface RemoveOptions {
  force?: boolean;
}

export async function removeWidget(nameOrPackage: string, options: RemoveOptions = {}): Promise<void> {
  const rootDir = process.cwd();
  const extensionsDir = path.join(rootDir, 'your-extensions', 'widgets');

  if (!fs.existsSync(path.join(rootDir, 'your-extensions'))) {
    console.error('Error: Run this from the ExB client folder.');
    return;
  }

  try {
    const installedWidgets = await fs.readdir(extensionsDir);
    let targetWidgetDir: string | null = null;

    for (const widget of installedWidgets) {
      const manifestPath = path.join(extensionsDir, widget, 'manifest.json');
      const pkgJsonPath = path.join(extensionsDir, widget, 'package.json');
      if (await fs.pathExists(manifestPath)) {
        const manifest: ExBManifest = await fs.readJson(manifestPath);
        const pkgJson: NpmResult = (await fs.pathExists(pkgJsonPath)) ? await fs.readJson(pkgJsonPath) : { name: manifest.name, version: manifest.version };
        if (manifest.name === nameOrPackage || widget === nameOrPackage || pkgJson.name === nameOrPackage) {
          targetWidgetDir = path.join(extensionsDir, widget);
          break;
        }
      }
    }

    if (!targetWidgetDir) {
      console.error(`Error: No installed widget found matching "${nameOrPackage}".`);
      return;
    }

    if (!options.force) {
      const confirm = await promptConfirmation(`Are you sure you want to remove the widget at ${targetWidgetDir}? (y/n)`);
      if (!confirm) {
        console.log('Aborting widget removal.');
        return;
      }
    }

    await fs.remove(targetWidgetDir);
    console.log(`Removed widget at ${targetWidgetDir} successfully!`);
  } catch (err: any) {
    console.error(`Error: Failed to remove widget: ${err.message}`);
  }
}

async function promptConfirmation(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    process.stdout.write(message + ' ');
    process.stdin.setEncoding('utf-8');
    process.stdin.resume();

    const onData = (data: string) => {
      const input = data.trim().toLowerCase();
      cleanup();
      resolve(input === 'y' || input === 'yes');
    };

    const onEnd = () => {
      cleanup();
      resolve(false);
    };

    function cleanup() {
      process.stdin.pause();
      process.stdin.removeListener('data', onData as any);
      process.stdin.removeListener('end', onEnd as any);
    }

    process.stdin.once('data', onData as any);
    process.stdin.once('end', onEnd as any);
  });
}