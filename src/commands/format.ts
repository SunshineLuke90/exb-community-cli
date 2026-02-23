import fs from 'fs-extra';
import path from 'path';
import readline from 'readline';
import pacote from 'pacote';
import validatePkgName from 'validate-npm-package-name';

export interface FormatOptions {
  force?: boolean;
}

interface ExBManifest {
  name?: string;
  label?: string;
  description?: string;
  author?: string;
  license?: string;
}

export async function formatWidget(widgetNameOrFolder: string, options: FormatOptions = {}): Promise<void> {
  const rootDir = process.cwd();
  const widgetsDir = path.join(rootDir, 'your-extensions', 'widgets');

  if (!fs.existsSync(path.join(rootDir, 'your-extensions'))) {
    console.error('Error: Run this from the ExB client folder.');
    return;
  }

  if (!(await fs.pathExists(widgetsDir))) {
    console.error('Error: No widgets folder found (your-extensions/widgets).');
    return;
  }

  // Find the widget folder by manifest.name or folder name
  const candidates = await fs.readdir(widgetsDir);
  let widgetFolder: string | null = null;
  let manifest: ExBManifest | null = null;

  for (const folder of candidates) {
    const manifestPath = path.join(widgetsDir, folder, 'manifest.json');
    if (await fs.pathExists(manifestPath)) {
      try {
        const m = await fs.readJson(manifestPath);
        if (m && (m.name.toLowerCase() === widgetNameOrFolder.toLowerCase() || folder.toLowerCase() === widgetNameOrFolder.toLowerCase())) {
          widgetFolder = path.join(widgetsDir, folder);
          manifest = m as ExBManifest;
          break;
        }
      } catch (err : any) {
        console.warn(`Warning: Failed to read manifest.json for widget candidate '${folder}': ${err.message || err}`);
      }
    }
  }

  if (!widgetFolder || !manifest) {
    console.error(`Error: widget '${widgetNameOrFolder}' not found in your-extensions/widgets`);
    return;
  }

  const pkgPath = path.join(widgetFolder, 'package.json');
  const pkgExists = await fs.pathExists(pkgPath);

  if (pkgExists && !options.force) {
    const proceed = await confirmPrompt(`package.json already exists for '${widgetNameOrFolder}' and will be modified. Proceed? (y/n)`);
    if (!proceed) {
      console.log('Aborted — package.json left unchanged.');
      return;
    }
  }

  // Collect package.json fields from manifest or prompt for missing values
  const pkg: any = {};

  const initialName = (manifest.name ?? (await askForValue('package name (npm-safe)'))) || '';
  pkg.name = await validateAndChooseName(initialName.toLowerCase(), options.force);

  pkg.version = (await askForValue('version', '1.0.0')) || '1.0.0';
  pkg.description = manifest.description ?? (await askForValue('description')) ?? '';
  pkg.author = manifest.author ?? (await askForValue('author')) ?? '';
  pkg.license = manifest.license ?? (await askForValue('license', 'MIT')) ?? 'MIT';
  pkg.keywords = ['exb-widget', 'experience-builder', 'exb'];

  // Backup existing package.json
  if (pkgExists) {
    const backupPath = pkgPath + `.bak-${Date.now()}`;
    await fs.copy(pkgPath, backupPath);
    console.log(`Existing package.json backed up to ${path.basename(backupPath)}`);
  }

  // Write package.json
  await fs.writeJson(pkgPath, pkg, { spaces: 2 });
  console.log(`Wrote package.json for widget '${widgetNameOrFolder}' (version ${pkg.version}).`);
}

async function askForValue(promptText: string, defaultValue?: string): Promise<string | undefined> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = defaultValue ? `${promptText} [${defaultValue}]: ` : `${promptText}: `;

  const answer: string = await new Promise((resolve) => rl.question(question, resolve));
  rl.close();

  const val = (answer || defaultValue || '').trim();
  return val === '' ? undefined : val;
}

async function confirmPrompt(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer: string = await new Promise((resolve) => rl.question(message + ' ', resolve));
  rl.close();
  const input = (answer || '').trim().toLowerCase();
  return input === 'y' || input === 'yes';
}

export async function isNameAvailable(name: string): Promise<boolean> {
  try {
    // If pacote.packument resolves, the package exists on the registry => not available
    await pacote.packument(name);
    return false;
  } catch (err: any) {
    // pkg not found (404) -> available; other errors -> rethrow
    const status = err && (err.statusCode || err.status);
    if (status === 404) return true;
    // Some registries return different messages — treat any 404-like as available
    if (/404|not found/i.test(String(err && err.message))) return true;
    throw err;
  }
}

export function suggestExbName(name: string): string {
  // preserve scope if present
  if (name.startsWith('@')) {
    const parts = name.split('/');
    const scope = parts[0];
    const pkg = parts[1] || '';
    return `${scope}/exb-${pkg}`;
  }
  return `exb-${name}`;
}

export async function makeUniqueName(base: string): Promise<string> {
  // append numeric suffix until available
  let attempt = base;
  let i = 1;
  while (!(await isNameAvailable(attempt))) {
    attempt = `${base}-${i}`;
    i += 1;
    if (i > 1000) throw new Error('Unable to find an available package name');
  }
  return attempt;
}

export async function validateAndChooseName(initial: string, force = false): Promise<string> {
  let name = (initial || '').trim();

  // keep prompting until valid & available
  while (true) {
    // validate format
    const res = validatePkgName(name || '');
    if (!res.validForNewPackages) {
      if (force) {
        // try to coerce with exb- prefix
        const suggested = suggestExbName(name || 'widget');
        const validSuggested = validatePkgName(suggested).validForNewPackages;
        if (!validSuggested) throw new Error(`Provided package name '${name}' is invalid and couldn't be coerced`);
        name = suggested;
      } else {
        console.log(`Invalid npm package name: ${(res.errors || []).concat(res.warnings || []).join('; ')}`);
        const entered = await askForValue('enter a valid package name (npm-safe)');
        if (!entered) throw new Error('Package name required');
        name = entered.trim();
        continue;
      }
    }

    // check availability
    try {
      const available = await isNameAvailable(name);
      if (available) return name;

      // name taken
      const suggested = suggestExbName(name);
      if (validatePkgName(suggested).validForNewPackages) {
        if (force) {
          const unique = await makeUniqueName(suggested);
          return unique;
        }

        const useSuggested = await confirmPrompt(`Package name '${name}' is already taken on npm. Use suggested '${suggested}' instead? (y/n)`);
        if (useSuggested) {
          const finalName = (await isNameAvailable(suggested)) ? suggested : await makeUniqueName(suggested);
          return finalName;
        }

        const entered = await askForValue('enter an alternative package name');
        if (!entered) throw new Error('Package name required');
        name = entered.trim();
        continue;
      } else {
        // suggested name invalid (rare)
        if (force) {
          const unique = await makeUniqueName(name);
          return unique;
        }

        console.log(`Package name '${name}' is taken and automatic suggestion is invalid.`);
        const entered = await askForValue('enter an alternative package name');
        if (!entered) throw new Error('Package name required');
        name = entered.trim();
        continue;
      }
    } catch (err: any) {
      // network / registry error — surface message and abort
      throw new Error(`Failed to check npm for package name availability: ${err.message || err}`);
    }
  }
}
