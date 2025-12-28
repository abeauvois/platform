import { command } from 'cleye';
import * as p from '@clack/prompts';
import { truncateText } from '@platform/utils';
import { createCliContext, getDefaultEmail } from '../../lib/cli-context.js';

/**
 * Gmail command - Trigger Gmail ingestion workflow
 *
 * Usage:
 *   cli list source gmail --filter=email@example.com --limit-days=7
 */
export const ingestGmailCommand = command({
    name: 'gmail',
    flags: {
        filter: {
            type: String,
            description: 'Email address to filter Gmail messages',
            alias: 'f',
        },
        limitDays: {
            type: Number,
            description: 'Limit ingestion to emails from the last N days',
            alias: 'l',
            default: 7,
        },
        withUrl: {
            type: Boolean,
            description: 'Include URL in processed items output',
            alias: 'u',
            default: false,
        },
    },
    help: {
        description: 'Trigger Gmail ingestion workflow',
    },
}, async (argv) => {
    p.intro('Gmail Source Ingestion as base content');

    try {
        // Create authenticated CLI context (handles auth, API client, and config)
        const ctx = await createCliContext();

        // Build filter options
        const filter: { email?: string; limitDays?: number; withUrl?: boolean } = {};

        // Use provided filter, or fall back to config/user email
        if (argv.flags.filter) {
            filter.email = argv.flags.filter;
        } else {
            const defaultEmail = getDefaultEmail(ctx);
            if (defaultEmail) {
                filter.email = defaultEmail;
            }
        }

        if (argv.flags.limitDays) {
            filter.limitDays = argv.flags.limitDays;
        }

        if (argv.flags.withUrl) {
            filter.withUrl = argv.flags.withUrl;
        }

        // Display configuration
        const configLines = [];
        if (filter.email) {
            configLines.push(`Filter: ${filter.email}`);
        }
        configLines.push(`Limit: ${filter.limitDays} days`);
        p.note(configLines.join('\n'), 'Configuration');

        // Create and execute workflow
        const workflow = ctx.apiClient.workflow.create('gmail', {
            filter,
            skipAnalysis: false,
            skipTwitter: true
        }
        );

        await workflow.execute({
            onItemProcessed: ({ index, total }) => {
                ctx.logger.info(`Processed ${index + 1}/${total} items`);
            },
            onError: () => {
                p.log.error('An error occurred during ingestion.');
            },
            onComplete: ({ processedItems }) => {
                processedItems.forEach(item => p.note(truncateText(item.rawContent, 300)));
            }
        });

        p.outro('Gmail ingestion completed successfully!');

    } catch (error) {
        p.log.error(error instanceof Error ? error.message : 'Unknown error');
        p.outro('Ingestion failed');
        process.exit(1);
    }
});
