#!/usr/bin/env node

// The line above is the "shebang". It MUST be the very first line of the file.
// It tells the user's operating system to execute this file using Node.js.

import { Command } from 'commander';
import { installWidget } from './commands/install';
import { updateWidget } from './commands/update';
import { searchWidgets } from './commands/search';
import { removeWidget } from './commands/remove';
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

// --- COMMAND: LIST (Example for future expansion) ---
program
  .command('list')
  .alias('ls')
  .description('List all community widgets currently installed in your project')
  .action(() => {
    console.log('Listing widgets is not yet implemented, but coming soon!');
    // Future logic: scan the client/your-extensions/widgets folder and print the names
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

// --- COMMAND: REMOVE ---
program
  .command('remove <package>')
  .alias('rm')
  .description('Remove an installed widget from your Experience Builder project')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (pkg: string, options) => {
    await removeWidget(pkg, { force: options.force });
  });

// Parse the arguments passed by the user in the terminal
program.parse(process.argv);

// If the user runs the CLI with no arguments, show the help menu
if (!process.argv.slice(2).length) {
  program.outputHelp();
}