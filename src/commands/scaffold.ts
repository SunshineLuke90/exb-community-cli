import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import degit from 'degit';
import Enquirer from 'enquirer';
import { collectManifests } from '../utils/manifestCollector';

export async function scaffoldWidget(name: string): Promise<void> {
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
  const repoSource = "Esri/arcgis-experience-builder-sdk-resources/widgets";

  const tmpDir = path.join(os.tmpdir(), `exb-scaffold-${Date.now()}`);
  await fs.ensureDir(tmpDir);

  try {
    const emitter = degit(repoSource, { cache: false, force: true, verbose: false });
    await emitter.clone(tmpDir);

    // Collect manifests from each widgets directory and merge results
    const manifestsMap: Record<string, any> = {};
    
    const m = await collectManifests(tmpDir);
    Object.assign(manifestsMap, m);
    

    const items = Object.entries(manifestsMap).map(([file, manifest]) => ({ file, manifest }));
    if (!items.length) {
      console.log('No widgets found in the widgets folders.');
      return;
    }

    console.log(`Found ${items.length} widgets in SDK-resources:`);
    const choices = items.map((it) => ({
      name: it.file,
      message: `${it.manifest.label ?? it.manifest.name} — ${it.manifest.description ?? ''}`,
      value: it.file
    }));

    try {
      console.clear();
      // Create prompt, and get user input
      const prompt = new Enquirer.Select({ name: 'widget', message: 'Choose a widget to scaffold', choices, limit: 10 });
      const chosenFile = await prompt.run();
      
      // Find the chosen item and copy its folder to the target location
      const chosen = items.find((i) => i.file === chosenFile)!;
      const widgetFolder = chosen.file.replace("/manifest.json", "");
      const targetPath = path.join(process.cwd(), 'your-extensions', 'widgets', name);
      await fs.copy(widgetFolder, targetPath);
      
      const manifestPath = path.join(targetPath, 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      //manifest.name = await validateAndChooseName(name);
      manifest.name = name;
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });
      console.log(`${chosen.manifest.label ?? chosen.manifest.name} scaffolded to ${targetPath}`);
    } catch (err: any) {
      console.log('No selection made or prompt cancelled.');
    }
  } finally {
    try {
      await fs.remove(tmpDir);
    } catch (e) {
      console.warn(`Warning: failed to remove temporary directory ${tmpDir}: ${(e as Error).message}`);
    }
  }
}
