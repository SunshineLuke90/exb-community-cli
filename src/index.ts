#!/usr/bin/env node

// The line above is the "shebang". It MUST be the very first line of the file.
// It tells the user's operating system to execute this file using Node.js.

import { Command } from 'commander';
import { installWidget } from './commands/install';
import { updateWidget } from './commands/update';
import { searchWidgets } from './commands/search';
import { removeWidget } from './commands/remove';
import { formatWidget } from './commands/format';
import { scaffoldWidget } from './commands/scaffold';
import * as fs from 'fs-extra';
import * as path from 'path';

const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = fs.readJsonSync(packageJsonPath, { throws: false }) || { version: '1.0.0' };

const program = new Command();

program
  .name('exb-cli')
  .description('The community-led widget manager for ArcGIS Experience Builder')
  .version(packageJson.version);

// --- COMMAND: INSTALL ---
program
  .command('install <package>')
  .alias('i') // Allows users to type `exb-cli i widget-name`
  .description('Install a widget from NPM into your Experience Builder project')
  .option('--widget-only', 'Skip running npm ci in the installed widget directory')
  .action(async (pkg: string, options) => {
    await installWidget(pkg, { widgetOnly: options.widgetOnly });
  });

// --- COMMAND: UPDATE ---
program
  .command('update <package>')
  .alias('u')
  .description('Update an installed widget to the latest version (or a specified version)')
  .option('--widget-only', 'Skip running npm ci in the updated widget directory')
  .option('--version <version>', 'Specify a version or dist-tag to update to')
  .action(async (pkg: string, options) => {
    await updateWidget(pkg, { widgetOnly: options.widgetOnly, version: options.version });
  });

// --- COMMAND: REMOVE ---
program
  .command('remove <package>')
  .alias('rm')
  .description('Remove an installed widget from your Experience Builder project')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (pkg: string, options) => {
    await removeWidget(pkg, { force: options.force });
  });

// --- COMMAND: SEARCH ---
program
  .command('search')
  .alias('s')
  .description('Search npm for Experience Builder widgets (by keyword)')
  .option('-k, --keyword <keyword>', 'Additional keyword to include in search')
  .option('-n, --size <size>', 'Maximum number of npm results to fetch (default: 15)')
  .option('--github-list', 'Include results from a curated GitHub list when available')
  .action(async (options) => {
    const size = options.size ? Number(options.size) : undefined;
    await searchWidgets({ keyword: options.keyword, size, githubList: options.githubList });
  });

// --- COMMAND: FORMAT ---
program
  .command('format <widget>')
  .alias('fmt')
  .description('Format a widget package according to community standards, based on the manifest.json configuration.')
  .option('-f, --force', 'Skip prompts and overwrite package.json if present')
  .action(async (widget: string, options) => {
    await formatWidget(widget, { force: options.force });
  });

// --- COMMAND: SCAFFOLD ---
program
  .command('scaffold <name>')
  .alias('new')
  .description('Scaffold a new widget package with a manifest.json, using an esri template')
  .action(async (name: string, options) => {
    await scaffoldWidget(name);
  })
  
  // Parse the arguments passed by the user in the terminal
program.parse(process.argv);

// If the user runs the CLI with no arguments, show the help menu
if (!process.argv.slice(2).length) {
  program.outputHelp();
}