import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';

interface RunNpmCiOptions {
  skip?: boolean;
}

export async function runNpmCi(widgetDir: string, options: RunNpmCiOptions = {}): Promise<void> {
  if (options.skip) {
    console.log('Skipping npm ci because --widget-only was provided.');
    return;
  }

  const shrinkwrap = path.join(widgetDir, 'npm-shrinkwrap.json');
  const lockFile = path.join(widgetDir, 'package-lock.json');
  const packageJson = path.join(widgetDir, 'package.json');

  if (await fs.pathExists(shrinkwrap)) {
    await runNpm(widgetDir, ['ci'], 'npm-shrinkwrap.json found; running npm ci in widget directory...');
    return;
  }

  if (await fs.pathExists(lockFile)) {
    await runNpm(widgetDir, ['ci'], 'Running npm ci in widget directory...');
    return;
  }

  if (await fs.pathExists(packageJson)) {
    await runNpm(widgetDir, ['install'], 'No lockfile found; running npm install in widget directory...');
    return;
  }

  console.log('No package.json found in widget; skipping dependency install.');
}

async function runNpm(cwd: string, args: string[], startMessage: string): Promise<void> {
  console.log(startMessage);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('npm', args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm ${args.join(' ')} exited with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}