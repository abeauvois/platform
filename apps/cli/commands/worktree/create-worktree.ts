import { command } from 'cleye';
import * as p from '@clack/prompts';
import { join, dirname } from 'path';
import { $ } from 'bun';
import { GitWorktree } from './lib/git-worktree.js';
import { EnvManager } from './lib/env-manager.js';
import { WarpLauncher } from './lib/warp-launcher.js';
import {
  calculatePorts,
  formatPortTable,
  isValidOffset,
} from './lib/port-calculator.js';

/**
 * Create worktree command - Creates a new git worktree with port offset configuration
 *
 * Usage:
 *   cli worktree create feature-auth 100
 *   cli worktree create bugfix-login 200 --no-open
 */
export const createWorktreeCommand = command(
  {
    name: 'create',
    parameters: ['<branch-name>', '[port-offset]'],
    flags: {
      open: {
        type: Boolean,
        description: 'Open Warp terminal tabs after creation',
        alias: 'o',
        default: true,
      },
      install: {
        type: Boolean,
        description: 'Run bun install after creation',
        alias: 'i',
        default: true,
      },
    },
    help: {
      description: 'Create a new git worktree with port offset configuration',
    },
  },
  async (argv) => {
    p.intro('Git Worktree Setup');

    const branchName = argv._.branchName;
    const offset = parseInt(argv._.portOffset || '0', 10);

    // Validate offset
    if (!isValidOffset(offset)) {
      p.log.error(
        'Port offset must be a non-negative multiple of 100 (e.g., 0, 100, 200)'
      );
      p.outro('Worktree creation cancelled');
      process.exit(1);
    }

    const ports = calculatePorts(offset);

    // Determine paths - find the repo root
    const repoRoot = process.cwd();
    const worktreesDir = join(dirname(repoRoot), 'platform-worktrees');
    const worktreePath = join(worktreesDir, branchName);

    // Display configuration
    p.note(
      [
        `Branch: ${branchName}`,
        `Path: ${worktreePath}`,
        `Port offset: ${offset}`,
        '',
        'Ports:',
        formatPortTable(ports),
      ].join('\n'),
      'Configuration'
    );

    const gitWorktree = new GitWorktree(repoRoot);
    const envManager = new EnvManager(repoRoot, worktreePath);
    const warpLauncher = new WarpLauncher();

    try {
      // Step 1: Create worktree
      const spinner = p.spinner();
      spinner.start('Creating git worktree...');

      const { isNewBranch } = await gitWorktree.create(worktreePath, branchName);
      spinner.stop(
        isNewBranch
          ? `Created new branch: ${branchName}`
          : `Using existing branch: ${branchName}`
      );

      // Step 2: Copy .env files
      spinner.start('Copying .env files...');
      const copiedFiles = await envManager.copyEnvFiles();
      spinner.stop(`Copied ${copiedFiles.length} .env files`);

      // Step 3: Configure ports
      spinner.start('Configuring ports...');
      await envManager.appendPortConfig(ports, offset);
      await envManager.updateAppEnvFiles(ports);
      spinner.stop('Port configuration complete');

      // Step 4: Run bun install (optional)
      if (argv.flags.install) {
        spinner.start('Installing dependencies...');
        try {
          await $`cd ${worktreePath} && bun install`.quiet();
          spinner.stop('Dependencies installed');
        } catch {
          spinner.stop('Failed to install dependencies');
          p.log.warn('You may need to run "bun install" manually');
        }
      }

      // Step 5: Launch Warp (optional)
      let warpConfigName = '';
      if (argv.flags.open) {
        if (warpLauncher.isAutoLaunchSupported()) {
          spinner.start('Opening Warp and creating launch config...');
          try {
            const { configName } = await warpLauncher.launchWorktree(
              worktreePath,
              branchName,
              ports
            );
            warpConfigName = configName;
            spinner.stop('Warp opened at worktree directory');
          } catch {
            spinner.stop('Failed to open Warp');
            warpConfigName = warpLauncher.getConfigName(branchName);
          }
        } else {
          warpConfigName = warpLauncher.getConfigName(branchName);
          p.log.warn(
            `Auto-launch not supported on ${warpLauncher.getPlatform()}.`
          );
        }
      }

      // Success summary
      const lines: Array<string> = [];

      // Warp launch config instructions
      if (warpConfigName) {
        lines.push('To start all dev servers in Warp:');
        lines.push('  1. Press CMD+CTRL+L to open Launch Configurations');
        lines.push(`  2. Search for "${warpConfigName}"`);
        lines.push('  3. Press Enter to launch');
        lines.push('');
      }

      // Manual steps if needed
      const nextSteps: Array<string> = [];
      if (!argv.flags.install) {
        nextSteps.push('bun install');
      }
      if (!warpConfigName) {
        nextSteps.push('bun run dev');
      }
      if (nextSteps.length > 0) {
        lines.push('Manual steps:');
        lines.push(`  cd ${worktreePath}`);
        nextSteps.forEach((s) => lines.push(`  ${s}`));
        lines.push('');
      }

      lines.push('Your services will be available at:');
      lines.push(`  API:            http://localhost:${ports.apiPort}`);
      lines.push(`  Dashboard:      http://localhost:${ports.dashboardPort}`);
      lines.push(`  Trading Server: http://localhost:${ports.tradingServerPort}`);
      lines.push(`  Trading Client: http://localhost:${ports.tradingClientPort}`);

      p.note(lines.join('\n'), 'Worktree Created Successfully');

      p.outro('Done!');
    } catch (error) {
      p.log.error(error instanceof Error ? error.message : 'Unknown error');
      p.outro('Worktree creation failed');
      process.exit(1);
    }
  }
);
