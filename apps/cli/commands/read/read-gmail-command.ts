import { command } from 'cleye';
import * as p from '@clack/prompts';
import { truncateText } from '@platform/utils';
import { createCliContext, getDefaultEmail } from '../../lib/cli-context.js';
import { ClackProgressReporter } from '../../lib/progress-reporter.js';
import {
	displayGmailConfig,
	readGmailMessages,
	displayGmailResults,
} from './lib/gmail-reader.js';

/**
 * Gmail command - Directly read Gmail messages via source reader
 *
 * Usage:
 *   cli read source gmail --filter=email@example.com --limit-days=7 --with-url
 */
export const readGmailCommand = command(
	{
		name: 'gmail',
		flags: {
			filter: {
				type: String,
				description: 'Email address to filter Gmail messages',
				alias: 'f',
			},
			limitDays: {
				type: Number,
				description: 'Limit read to emails from the last N days',
				alias: 'l',
				default: 7,
			},
			withUrl: {
				type: Boolean,
				description: 'Only include emails containing URLs',
				alias: 'u',
				default: false,
			},
		},
		help: {
			description: 'Read Gmail messages directly (no workflow/task)',
		},
	},
	async (argv) => {
		p.intro('Gmail Source Read');

		const reporter = new ClackProgressReporter();

		try {
			// Create authenticated CLI context (handles auth, API client, and config)
			const ctx = await createCliContext();

			// Build filter options
			let email: string | undefined;

			// Use provided filter, or fall back to config/user email
			if (argv.flags.filter) {
				email = argv.flags.filter;
			} else {
				const defaultEmail = getDefaultEmail(ctx);
				if (defaultEmail) {
					email = defaultEmail;
				}
			}

			const options = {
				email,
				limitDays: argv.flags.limitDays,
				withUrl: argv.flags.withUrl,
			};

			// Display configuration
			displayGmailConfig(options, reporter);

			// Read Gmail messages
			const items = await readGmailMessages(ctx.apiClient, options, reporter);

			// Display results
			displayGmailResults(items, reporter, truncateText);

			p.outro('Gmail read completed successfully!');
		} catch (error) {
			reporter.error(error instanceof Error ? error.message : 'Unknown error');
			p.outro('Read failed');
			process.exit(1);
		}
	}
);
