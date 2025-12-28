import { command } from 'cleye';
import { ingestGmailCommand } from './ingest-gmail-command.js';

/**
 * Source command - Manage data sources for ingestion
 *
 * Usage:
 *   cli ingest source gmail [options]
 */
export const sourceCommand = command({
    name: 'source',
    commands: [ingestGmailCommand],
    help: {
        description: 'Manage data sources for ingestion',
    },
});
