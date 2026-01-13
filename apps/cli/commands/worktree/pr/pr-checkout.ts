import { command } from 'cleye';
import * as p from '@clack/prompts';
import { join, dirname } from 'path';
import { GitHubPr } from '../lib/github-pr.js';
import {
	resolvePortOffset,
	displayConfiguration,
	runWorktreeSetup,
	displaySuccessSummary,
} from '../lib/worktree-setup.js';
import { calculatePorts } from '../lib/port-calculator.js';
import { ClackProgressReporter } from '../lib/clack-progress-reporter.js';

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
		const reporter = new ClackProgressReporter();

		if (isNaN(prNumber) || prNumber <= 0) {
			reporter.error('Invalid PR number');
			p.outro('Checkout cancelled');
			process.exit(1);
		}

		const repoRoot = process.cwd();
		const githubPr = new GitHubPr(repoRoot);

		try {
			// Resolve port offset
			const manualOffset = argv._.portOffset
				? parseInt(argv._.portOffset, 10)
				: undefined;
			const { offset, autoAssigned } = await resolvePortOffset(repoRoot, manualOffset, reporter);

			// Check gh CLI is available
			reporter.start('Checking GitHub CLI...');

			const { installed, authenticated } = await githubPr.checkGhInstalled();

			if (!installed) {
				reporter.stop('GitHub CLI not found');
				reporter.error(
					'GitHub CLI (gh) is not installed.\nInstall from: https://cli.github.com/'
				);
				p.outro('Checkout cancelled');
				process.exit(1);
			}

			if (!authenticated) {
				reporter.stop('GitHub CLI not authenticated');
				reporter.error('GitHub CLI is not authenticated.\nRun: gh auth login');
				p.outro('Checkout cancelled');
				process.exit(1);
			}

			reporter.stop('GitHub CLI ready');

			// Get PR info
			reporter.start(`Fetching PR #${prNumber} info...`);
			const prInfo = await githubPr.getPrInfo(prNumber);

			if (!prInfo) {
				reporter.stop('PR not found');
				reporter.error(`PR #${prNumber} not found`);
				p.outro('Checkout cancelled');
				process.exit(1);
			}

			reporter.stop(`Found PR: ${prInfo.title}`);

			const branchName = prInfo.headRefName;
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
				prInfo: {
					number: prNumber,
					title: prInfo.title,
					author: prInfo.author,
					state: prInfo.state,
					isDraft: prInfo.isDraft,
				},
			}, reporter);

			// Fetch PR branch
			reporter.start('Fetching PR branch...');
			await githubPr.fetchPrBranch(prNumber);
			reporter.stop('Branch fetched');

			// Run setup steps
			const result = await runWorktreeSetup({
				branchName,
				repoRoot,
				offset,
				install: argv.flags.install,
				openWarp: argv.flags.open,
			}, reporter);

			// Display success summary
			displaySuccessSummary(result, {
				install: argv.flags.install,
				prInfo: {
					number: prNumber,
					title: prInfo.title,
					url: prInfo.url,
				},
			}, reporter);

			p.outro('Done!');
		} catch (error) {
			reporter.error(error instanceof Error ? error.message : 'Unknown error');
			p.outro('Checkout failed');
			process.exit(1);
		}
	}
);
