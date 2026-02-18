#!/usr/bin/env node

// The line above is the "shebang". It MUST be the very first line of the file.
// It tells the user's operating system to execute this file using Node.js.

import { Command } from 'commander';
import { installWidget } from './commands/install';
import * as fs from 'fs-extra';
import * as path from 'path';

// Dynamically load the version from your package.json so you don't have to hardcode it
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
  .action(async (pkg: string) => {
    // This calls the logic we wrote in the previous step
    await installWidget(pkg);
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

// Parse the arguments passed by the user in the terminal
program.parse(process.argv);

// If the user runs the CLI with no arguments, show the help menu
if (!process.argv.slice(2).length) {
  program.outputHelp();
}