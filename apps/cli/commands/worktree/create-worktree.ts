import { command } from 'cleye';
import * as p from '@clack/prompts';
import { join, dirname } from 'path';
import {
	resolvePortOffset,
	displayConfiguration,
	runWorktreeSetup,
	displaySuccessSummary,
} from './lib/worktree-setup.js';
import { calculatePorts } from './lib/port-calculator.js';
import { ClackProgressReporter } from './lib/clack-progress-reporter.js';

/**
 * Create worktree command - Creates a new git worktree with port offset configuration
 *
 * Usage:
 *   cli worktree create feature-auth          # Auto-assigns next available offset
 *   cli worktree create feature-auth 100      # Uses specified offset
 *   cli worktree create bugfix-login --no-open
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
		const repoRoot = process.cwd();
		const reporter = new ClackProgressReporter();

		try {
			// Resolve port offset
			const manualOffset = argv._.portOffset
				? parseInt(argv._.portOffset, 10)
				: undefined;
			const { offset, autoAssigned } = await resolvePortOffset(repoRoot, manualOffset, reporter);

			const ports = calculatePorts(offset);
			const worktreesDir = join(dirname(repoRoot), 'platform-worktrees');
			const worktreePath = join(worktreesDir, branchName);

			// Display configuration
			displayConfiguration({
				branchName,
				worktreePath,
				offset,
				autoAssigned,
				ports,
			}, reporter);

			// Run setup steps
			const result = await runWorktreeSetup({
				branchName,
				repoRoot,
				offset,
				install: argv.flags.install,
				openWarp: argv.flags.open,
			}, reporter);

			// Display success summary
			displaySuccessSummary(result, { install: argv.flags.install }, reporter);

			p.outro('Done!');
		} catch (error) {
			reporter.error(error instanceof Error ? error.message : 'Unknown error');
			p.outro('Worktree creation failed');
			process.exit(1);
		}
	}
);
