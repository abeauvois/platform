import { command } from 'cleye';
import { readGmailCommand } from './read-gmail-command.js';

/**
 * Source command - Read data from various sources
 *
 * Usage:
 *   cli read source gmail [options]
 */
export const sourceCommand = command({
	name: 'source',
	commands: [readGmailCommand],
	help: {
		description: 'Read data from various sources',
	},
});
