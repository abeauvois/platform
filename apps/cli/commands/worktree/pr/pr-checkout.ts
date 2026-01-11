import { command } from 'cleye';
import * as p from '@clack/prompts';
import { join, dirname } from 'path';
import { $ } from 'bun';
import { GitHubPr } from '../lib/github-pr.js';
import { GitWorktree } from '../lib/git-worktree.js';
import { EnvManager } from '../lib/env-manager.js';
import { WarpLauncher } from '../lib/warp-launcher.js';
import {
  calculatePorts,
  formatPortTable,
  isValidOffset,
  getNextAvailableOffset,
} from '../lib/port-calculator.js';

/**
 * PR Checkout command - Create a worktree from an existing GitHub PR
 *
 * Usage:
 *   cli worktree pr checkout 123          # Auto-assigns port offset
 *   cli worktree pr checkout 123 100      # Uses specified offset
 *   cli worktree pr checkout 123 --no-open --no-install
 */
export const prCheckoutCommand = command(
  {
    name: 'checkout',
    parameters: ['<pr-number>', '[port-offset]'],
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
      description: 'Create a worktree from an existing GitHub PR',
    },
  },
  async (argv) => {
    p.intro('Checkout PR to Worktree');

    const prNumber = parseInt(argv._.prNumber, 10);

    if (isNaN(prNumber) || prNumber <= 0) {
      p.log.error('Invalid PR number');
      p.outro('Checkout cancelled');
      process.exit(1);
    }

    const repoRoot = process.cwd();
    const githubPr = new GitHubPr(repoRoot);

    // Auto-assign or use provided offset
    let offset: number;
    let autoAssigned = false;

    if (argv._.portOffset) {
      offset = parseInt(argv._.portOffset, 10);
      // Validate manual offset
      if (!isValidOffset(offset)) {
        p.log.error(
          'Port offset must be a non-negative multiple of 100 (e.g., 0, 100, 200)'
        );
        p.outro('Checkout cancelled');
        process.exit(1);
      }
    } else {
      // Auto-assign next available offset
      const spinner = p.spinner();
      spinner.start('Finding available port offset...');
      offset = await getNextAvailableOffset(repoRoot);
      autoAssigned = true;
      spinner.stop(`Auto-assigned port offset: ${offset}`);
    }

    // Check gh CLI is available
    const spinner = p.spinner();
    spinner.start('Checking GitHub CLI...');

    const { installed, authenticated } = await githubPr.checkGhInstalled();

    if (!installed) {
      spinner.stop('GitHub CLI not found');
      p.log.error(
        'GitHub CLI (gh) is not installed.\nInstall from: https://cli.github.com/'
      );
      p.outro('Checkout cancelled');
      process.exit(1);
    }

    if (!authenticated) {
      spinner.stop('GitHub CLI not authenticated');
      p.log.error('GitHub CLI is not authenticated.\nRun: gh auth login');
      p.outro('Checkout cancelled');
      process.exit(1);
    }

    spinner.stop('GitHub CLI ready');

    // Get PR info
    spinner.start(`Fetching PR #${prNumber} info...`);
    const prInfo = await githubPr.getPrInfo(prNumber);

    if (!prInfo) {
      spinner.stop('PR not found');
      p.log.error(`PR #${prNumber} not found`);
      p.outro('Checkout cancelled');
      process.exit(1);
    }

    spinner.stop(`Found PR: ${prInfo.title}`);

    const branchName = prInfo.headRefName;
    const ports = calculatePorts(offset);
    const worktreesDir = join(dirname(repoRoot), 'platform-worktrees');
    const worktreePath = join(worktreesDir, branchName);

    // Display configuration
    p.note(
      [
        `PR #${prNumber}: ${prInfo.title}`,
        `Author: ${prInfo.author}`,
        `State: ${prInfo.state}${prInfo.isDraft ? ' (draft)' : ''}`,
        '',
        `Branch: ${branchName}`,
        `Path: ${worktreePath}`,
        `Port offset: ${offset}${autoAssigned ? ' (auto-assigned)' : ''}`,
        '',
        'Ports:',
        formatPortTable(ports),
      ].join('\n'),
      'Configuration'
    );

    // Fetch PR branch
    spinner.start('Fetching PR branch...');
    try {
      await githubPr.fetchPrBranch(prNumber);
      spinner.stop('Branch fetched');
    } catch (error) {
      spinner.stop('Failed to fetch branch');
      p.log.error(error instanceof Error ? error.message : 'Fetch failed');
      p.outro('Checkout cancelled');
      process.exit(1);
    }

    const gitWorktree = new GitWorktree(repoRoot);
    const envManager = new EnvManager(repoRoot, worktreePath);
    const warpLauncher = new WarpLauncher();

    try {
      // Step 1: Create worktree
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

      lines.push(`PR #${prNumber}: ${prInfo.title}`);
      lines.push(`URL: ${prInfo.url}`);
      lines.push('');

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

      p.note(lines.join('\n'), 'PR Checkout Complete');

      p.outro('Done!');
    } catch (error) {
      p.log.error(error instanceof Error ? error.message : 'Unknown error');
      p.outro('Checkout failed');
      process.exit(1);
    }
  }
);
