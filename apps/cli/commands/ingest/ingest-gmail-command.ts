import { command } from 'cleye';
import * as p from '@clack/prompts';
import { SAVE_TO_DESTINATIONS } from '@platform/sdk';
import { createCliContext, getDefaultEmail } from '../../lib/cli-context.js';
import type { SaveToDestination } from '@platform/sdk';

type GmailFlags = {
    filter?: string;
    limitDays: number;
    withUrl: boolean;
    saveTo: string;
};

type GmailFilter = {
    email?: string;
    limitDays?: number;
    withUrl?: boolean;
};

function buildGmailConfig(flags: GmailFlags, defaultEmail?: string): { filter: GmailFilter; saveTo: SaveToDestination } {
    const filter: GmailFilter = {};

    // Use provided filter, or fall back to config/user email
    if (flags.filter) {
        filter.email = flags.filter;
    } else {
        if (defaultEmail) {
            filter.email = defaultEmail;
        }
    }

    if (flags.limitDays) {
        filter.limitDays = flags.limitDays;
    }

    if (flags.withUrl) {
        filter.withUrl = flags.withUrl;
    }

    // Validate saveTo option
    const saveTo = flags.saveTo as SaveToDestination;
    if (!SAVE_TO_DESTINATIONS.includes(saveTo)) {
        p.log.error(`Invalid saveTo value: ${saveTo}. Must be one of: ${SAVE_TO_DESTINATIONS.join(', ')}`);
        process.exit(1);
    }

    // Display configuration
    const configLines = [];
    if (filter.email) {
        configLines.push(`Filter: ${filter.email}`);
    }
    configLines.push(`Limit: ${filter.limitDays} days`);
    configLines.push(`Save to: ${saveTo}`);
    p.note(configLines.join('\n'), 'Configuration');

    return { filter, saveTo };
}

/**
 * Gmail command - Trigger Gmail ingestion workflow
 *
 * Usage:
 *   cli list source gmail --filter=email@example.com --limit-days=7 --save-to=database
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
        saveTo: {
            type: String,
            description: `Where to save processed items (${SAVE_TO_DESTINATIONS.join(', ')})`,
            alias: 's',
            default: 'console',
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
        const defaultEmail = getDefaultEmail(ctx);
        const apiClient = ctx.apiClient

        const { filter, saveTo } = buildGmailConfig(argv.flags, defaultEmail);

        let workflow;

        if (saveTo === 'bookmarks') {

            workflow = apiClient.workflow.create('bookmarkEnrichment', {
                filter,
                skipAnalysis: false,
                skipTwitter: true,
                saveTo,
            })
        }
        else {

            workflow = apiClient.workflow.create('gmail', {
                filter,
                skipAnalysis: false,
                skipTwitter: true,
                saveTo,
            })
        };

        await workflow.execute({
            onItemProcessed: ({ index, total }) => {
                ctx.logger.info(`Processed ${index + 1}/${total} items`);
            },
            onError: () => {
                p.log.error('An error occurred during ingestion.');
            },
            onComplete: ({ processedItems }) => {
                processedItems.forEach((item) => p.note(`${item.tags.join(',')} \n ${item.summary}`));
            }
        });

        p.outro('Gmail ingestion completed successfully!');

    } catch (error) {
        p.log.error(error instanceof Error ? error.message : 'Unknown error');
        p.outro('Ingestion failed');
        process.exit(1);
    }
});
