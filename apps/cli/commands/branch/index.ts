import { command, cli } from 'cleye';
import { createBranchCommand } from './create-branch.js';

const allCommands = [createBranchCommand];

/**
 * Branch command - Git branch utilities
 *
 * Usage:
 *   cli branch create "fix: This is a bug fix"
 *   cli branch create "feature: new api" --dry-run
 */
export const branchCommand = command(
	{
		name: 'branch',
		commands: allCommands,
		help: {
			description: 'Git branch utilities',
		},
	},
	(argv) => {
		// Workaround: Cleye has issues with nested commands matching.
		// We need to manually dispatch to subcommands.

		const branchIndex = process.argv.indexOf('branch');
		if (branchIndex === -1) return;

		const args = process.argv.slice(branchIndex + 1);

		// Find the subcommand (first non-flag argument)
		const subcommand = args.find((arg) => !arg.startsWith('-'));

		if (subcommand && ['create'].includes(subcommand)) {
			cli(
				{
					name: 'branch',
					commands: allCommands,
				},
				undefined,
				args
			);
		}
	}
);

// Early interception for help flags with subcommands
function maybeDispatchWithHelp(): void {
	const args = process.argv;
	const branchIndex = args.indexOf('branch');

	if (branchIndex === -1) return;

	const branchArgs = args.slice(branchIndex + 1);

	// Check if there's a subcommand followed by or preceded by a help flag
	const hasHelp = branchArgs.some((arg) => arg === '-h' || arg === '--help');
	const subcommand = branchArgs.find((arg) => !arg.startsWith('-'));

	if (hasHelp && subcommand && ['create'].includes(subcommand)) {
		// Dispatch to nested CLI which will show the correct help
		cli(
			{
				name: 'branch',
				commands: allCommands,
			},
			undefined,
			branchArgs
		);
		process.exit(0);
	}
}

maybeDispatchWithHelp();
