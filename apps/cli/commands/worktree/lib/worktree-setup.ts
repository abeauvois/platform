import { join, dirname } from 'path';
import { $ } from 'bun';
import { GitWorktree } from './git-worktree.js';
import { EnvManager } from './env-manager.js';
import { WarpLauncher } from './warp-launcher.js';
import {
	calculatePorts,
	formatPortTable,
	isValidOffset,
	getNextAvailableOffset,
} from './port-calculator.js';
import type { PortConfig, IProgressReporter } from './types.js';

/**
 * Options for worktree setup
 */
export interface WorktreeSetupOptions {
	branchName: string;
	repoRoot: string;
	portOffset?: number;
	install?: boolean;
	openWarp?: boolean;
}

/**
 * Result of worktree setup
 */
export interface WorktreeSetupResult {
	worktreePath: string;
	branchName: string;
	ports: PortConfig;
	offset: number;
	isNewBranch: boolean;
	warpConfigName: string;
}

/**
 * Resolve port offset - validates manual offset or auto-assigns
 */
export async function resolvePortOffset(
	repoRoot: string,
	manualOffset: number | undefined,
	reporter: IProgressReporter
): Promise<{ offset: number; autoAssigned: boolean }> {
	if (manualOffset !== undefined) {
		if (!isValidOffset(manualOffset)) {
			throw new Error(
				'Port offset must be a non-negative multiple of 100 (e.g., 0, 100, 200)'
			);
		}
		return { offset: manualOffset, autoAssigned: false };
	}

	reporter.start('Finding available port offset...');
	const offset = await getNextAvailableOffset(repoRoot);
	reporter.stop(`Auto-assigned port offset: ${offset}`);

	return { offset, autoAssigned: true };
}

/**
 * Display worktree configuration
 */
export function displayConfiguration(
	config: {
		branchName: string;
		worktreePath: string;
		offset: number;
		autoAssigned: boolean;
		ports: PortConfig;
		prInfo?: { number: number; title: string; author: string; state: string; isDraft: boolean };
	},
	reporter: IProgressReporter
): void {
	const lines: Array<string> = [];

	if (config.prInfo) {
		lines.push(`PR #${config.prInfo.number}: ${config.prInfo.title}`);
		lines.push(`Author: ${config.prInfo.author}`);
		lines.push(`State: ${config.prInfo.state}${config.prInfo.isDraft ? ' (draft)' : ''}`);
		lines.push('');
	}

	lines.push(`Branch: ${config.branchName}`);
	lines.push(`Path: ${config.worktreePath}`);
	lines.push(`Port offset: ${config.offset}${config.autoAssigned ? ' (auto-assigned)' : ''}`);
	lines.push('');
	lines.push('Ports:');
	lines.push(formatPortTable(config.ports));

	reporter.note(lines.join('\n'), 'Configuration');
}

/**
 * Run the worktree setup steps (create, env, ports, install, warp)
 */
export async function runWorktreeSetup(
	options: WorktreeSetupOptions & { offset: number },
	reporter: IProgressReporter
): Promise<WorktreeSetupResult> {
	const { branchName, repoRoot, offset, install = true, openWarp = true } = options;

	const ports = calculatePorts(offset);
	const worktreesDir = join(dirname(repoRoot), 'platform-worktrees');
	const worktreePath = join(worktreesDir, branchName);

	const gitWorktree = new GitWorktree(repoRoot);
	const envManager = new EnvManager(repoRoot, worktreePath);
	const warpLauncher = new WarpLauncher();

	// Step 1: Create worktree
	reporter.start('Creating git worktree...');
	const { isNewBranch } = await gitWorktree.create(worktreePath, branchName);
	reporter.stop(
		isNewBranch
			? `Created new branch: ${branchName}`
			: `Using existing branch: ${branchName}`
	);

	// Step 2: Copy .env files
	reporter.start('Copying .env files...');
	const copiedFiles = await envManager.copyEnvFiles();
	reporter.stop(`Copied ${copiedFiles.length} .env files`);

	// Step 3: Copy Claude Code settings
	reporter.start('Copying Claude Code settings...');
	const copiedClaudeSettings = await envManager.copyClaudeSettings();
	if (copiedClaudeSettings.length > 0) {
		reporter.stop(`Copied Claude settings: ${copiedClaudeSettings.join(', ')}`);
	} else {
		reporter.stop('No Claude settings to copy');
	}

	// Step 4: Configure ports
	reporter.start('Configuring ports...');
	await envManager.appendPortConfig(ports, offset);
	await envManager.updateAppEnvFiles(ports);
	reporter.stop('Port configuration complete');

	// Step 5: Run git pull --rebase origin main && bun install (optional)
	if (install) {
		reporter.start('Running git pull --rebase origin main and installing dependencies...');
		try {
			await $`cd ${worktreePath} && git pull --rebase origin main`.quiet();
			await $`cd ${worktreePath} && bun install`.quiet();
			reporter.stop('Dependencies installed');
		} catch {
			reporter.stop('Failed to install dependencies');
			reporter.warn('You may need to run "bun install" manually');
		}
	}

	// Step 6: Launch Warp (optional)
	let warpConfigName = '';
	if (openWarp) {
		if (warpLauncher.isAutoLaunchSupported()) {
			reporter.start('Opening Warp and creating launch config...');
			try {
				const { configName } = await warpLauncher.launchWorktree(
					worktreePath,
					branchName,
					ports
				);
				warpConfigName = configName;
				reporter.stop('Warp opened at worktree directory');
			} catch {
				reporter.stop('Failed to open Warp');
				warpConfigName = warpLauncher.getConfigName(branchName);
			}
		} else {
			warpConfigName = warpLauncher.getConfigName(branchName);
			reporter.warn(`Auto-launch not supported on ${warpLauncher.getPlatform()}.`);
		}
	}

	return {
		worktreePath,
		branchName,
		ports,
		offset,
		isNewBranch,
		warpConfigName,
	};
}

/**
 * Display success summary after worktree setup
 */
export function displaySuccessSummary(
	result: WorktreeSetupResult,
	options: { install: boolean; prInfo?: { number: number; title: string; url: string } },
	reporter: IProgressReporter
): void {
	const lines: Array<string> = [];

	// PR info if applicable
	if (options.prInfo) {
		lines.push(`PR #${options.prInfo.number}: ${options.prInfo.title}`);
		lines.push(`URL: ${options.prInfo.url}`);
		lines.push('');
	}

	// Warp launch config instructions
	if (result.warpConfigName) {
		lines.push('To start all dev servers in Warp:');
		lines.push('  1. Press CMD+CTRL+L to open Launch Configurations');
		lines.push(`  2. Search for "${result.warpConfigName}"`);
		lines.push('  3. Press Enter to launch');
		lines.push('');
	}

	// Manual steps if needed
	const nextSteps: Array<string> = [];
	if (!options.install) {
		nextSteps.push('bun install');
	}
	if (!result.warpConfigName) {
		nextSteps.push('bun run dev');
	}
	if (nextSteps.length > 0) {
		lines.push('Manual steps:');
		lines.push(`  cd ${result.worktreePath}`);
		nextSteps.forEach((s) => lines.push(`  ${s}`));
		lines.push('');
	}

	lines.push('Your services will be available at:');
	lines.push(`  API:            http://localhost:${result.ports.apiPort}`);
	lines.push(`  Dashboard:      http://localhost:${result.ports.dashboardPort}`);
	lines.push(`  Trading Server: http://localhost:${result.ports.tradingServerPort}`);
	lines.push(`  Trading Client: http://localhost:${result.ports.tradingClientPort}`);

	const title = options.prInfo ? 'PR Checkout Complete' : 'Worktree Created Successfully';
	reporter.note(lines.join('\n'), title);
}
