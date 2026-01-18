#!/usr/bin/env bun

import { cli } from 'cleye';
import { branchCommand } from './commands/branch/index.js';
import { readCommand } from './commands/read/index.js';
import { ingestCommand } from './commands/ingest/index.js';
import { worktreeCommand } from './commands/worktree/index.js';
import { scrapeCommand } from './commands/scrape/index.js';

/**
 * CLI Entry Point: Platform CLI
 * Unified CLI instance using Cleye's command pattern
 */

cli({
    name: 'platform-cli',
    version: '0.0.2',

    flags: {
        verbose: {
            type: Boolean,
            description: 'Enable verbose logging',
            alias: 'v',
            default: false,
        },
    },

    commands: [branchCommand, readCommand, ingestCommand, worktreeCommand, scrapeCommand],

    help: {
        description: 'Platform CLI for managing personal data',
    },
});
