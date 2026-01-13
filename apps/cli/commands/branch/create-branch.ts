import { command } from 'cleye';
import * as p from '@clack/prompts';
import { $ } from 'bun';
import { sanitizeBranchName } from './lib/branch-name-sanitizer.js';

/**
 * Create branch command - Creates a git branch from arbitrary text
 *
 * Usage:
 *   cli branch create "fix: This is a bug fix"      # Creates branch (stays on current)
 *   cli branch create "feature: new api" --dry-run  # Only shows sanitized name
 */
export const createBranchCommand = command(
	{
		name: 'create',
		parameters: ['<text>'],
		flags: {
			dryRun: {
				type: Boolean,
				description: 'Only show the sanitized branch name without creating',
				alias: 'd',
				default: false,
			},
		},
		help: {
			description: 'Create a git branch from arbitrary text',
		},
	},
	async (argv) => {
		const inputText = argv._.text;
		const branchName = sanitizeBranchName(inputText);

		if (!branchName) {
			p.log.error('Unable to create a valid branch name from the provided text');
			process.exit(1);
		}

		if (argv.flags.dryRun) {
			p.intro('Branch Name Preview');
			p.note(`Input: ${inputText}\nBranch: ${branchName}`, 'Sanitized');
			p.outro('');
			return;
		}

		p.intro('Create Git Branch');

		const spinner = p.spinner();
		spinner.start(`Creating branch: ${branchName}`);

		try {
			await $`git branch ${branchName}`.quiet();
			spinner.stop(`Created branch: ${branchName}`);
			p.outro('Done!');
		} catch (error) {
			spinner.stop('Failed to create branch');
			if (error instanceof Error && error.message.includes('already exists')) {
				p.log.error(`Branch '${branchName}' already exists`);
			} else {
				p.log.error(error instanceof Error ? error.message : 'Unknown error');
			}
			process.exit(1);
		}
	}
);
