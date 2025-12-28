import { command } from 'cleye';
import * as p from '@clack/prompts';
import { truncateText } from '@platform/utils';
import { createCliContext, getDefaultEmail } from '../../lib/cli-context.js';

/**
 * Gmail command - Directly read Gmail messages via source reader
 *
 * Usage:
 *   cli list source gmail --filter=email@example.com --limit-days=7 --with-url
 */
export const listGmailCommand = command({
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
}, async (argv) => {
    p.intro('Gmail Source read');

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

        // Display configuration
        const configLines = [];
        if (email) {
            configLines.push(`Filter: ${email}`);
        }
        configLines.push(`Limit: ${argv.flags.limitDays} days`);
        if (argv.flags.withUrl) {
            configLines.push('Only emails with URLs');
        }
        p.note(configLines.join('\n'), 'Configuration');

        // Directly read from Gmail source (no workflow/task)
        const spinner = p.spinner();
        spinner.start('Fetching Gmail messages...');

        const items = await ctx.apiClient.sources.readGmail({
            email,
            limitDays: argv.flags.limitDays,
            withUrl: argv.flags.withUrl,
        });

        spinner.stop(`Found ${items.length} messages`);

        // Display results
        if (items.length === 0) {
            p.log.info('No messages found matching criteria.');
        } else {
            for (const item of items) {
                p.note(truncateText(item.rawContent, 300));
            }
        }

        p.outro('Gmail read completed successfully!');

    } catch (error) {
        p.log.error(error instanceof Error ? error.message : 'Unknown error');
        p.outro('Read failed');
        process.exit(1);
    }
});
