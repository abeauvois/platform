import { command, cli } from 'cleye';
import { sourceCommand } from './source.js';
import { readGmailCommand } from './read-gmail-command.js';

/**
 * Read command - Read data from platform sources
 *
 * Usage:
 *   cli read source gmail [options]
 */
export const readCommand = command(
	{
		name: 'read',
		commands: [sourceCommand],
		help: {
			description: 'Read from platform data sources',
		},
	},
	(argv) => {
		// Workaround: Cleye has issues with deep nested commands matching.
		// If we land here, it means subcommands were not matched automatically.
		// We manually check for 'source' subcommand and dispatch to a new CLI instance.

		if (argv._[0] === 'source') {
			// If gmail is the next command, dispatch directly to gmail
			if (argv._[1] === 'gmail') {
				// Find where 'source' is in process.argv to slice correctly
				const sourceIndex = process.argv.indexOf('source');
				if (sourceIndex !== -1) {
					const args = process.argv.slice(sourceIndex + 1); // ['gmail', '--filter=...', ...]

					cli(
						{
							commands: [readGmailCommand],
						},
						undefined,
						args
					);
					return;
				}
			}

			// Fallback for just 'source' or other subcommands
			const readIndex = process.argv.indexOf('read');
			if (readIndex !== -1) {
				const args = process.argv.slice(readIndex + 1); // ['source', ...]
				cli(
					{
						commands: [sourceCommand],
					},
					undefined,
					args
				);
			}
		}
	}
);
