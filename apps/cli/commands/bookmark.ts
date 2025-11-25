import { command } from 'cleye';
import { ingestCommand } from './ingest.js';
import { listCommand } from './list.js';

/**
 * Bookmark command - Manage personal bookmarks
 * 
 * Sub-commands:
 *   ingest  - Fetch bookmarks from various sources
 *   list    - List bookmarks from API
 * 
 * Usage:
 *   cli personal bookmark ingest -f gmail -t csv
 *   cli personal bookmark list
 */
export const bookmarkCommand = command({
    name: 'bookmark',
    commands: [
        ingestCommand,
        listCommand
    ],
});
