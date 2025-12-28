import { command, cli } from 'cleye';
import { sourceCommand } from './source';
import { ingestGmailCommand } from './ingest-gmail-command.js';

/**
 * ingest command - ingest and manage platform data
 *
 * Usage:
 *   cli ingest source gmail [options]
 */
export const ingestCommand = command(
    {
        name: 'ingest',
        commands: [sourceCommand],
        help: {
            description: 'ingest and manage platform data',
        },
    },
    argv => {
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
                            commands: [ingestGmailCommand],
                        },
                        undefined,
                        args
                    );
                    return;
                }
            }

            // Fallback for just 'source' or other subcommands
            const listIndex = process.argv.indexOf('list');
            if (listIndex !== -1) {
                const args = process.argv.slice(listIndex + 1); // ['source', ...]
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
