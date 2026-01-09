import { command, cli } from 'cleye';
import { createWorktreeCommand } from './create-worktree.js';
import { listWorktreeCommand } from './list-worktree.js';
import { removeWorktreeCommand } from './remove-worktree.js';

/**
 * Worktree command - Manage git worktrees for parallel development
 *
 * Usage:
 *   cli worktree create <branch-name> [port-offset]
 *   cli worktree list
 *   cli worktree remove <branch-name>
 */
export const worktreeCommand = command(
  {
    name: 'worktree',
    commands: [
      createWorktreeCommand,
      listWorktreeCommand,
      removeWorktreeCommand,
    ],
    help: {
      description: 'Manage git worktrees for parallel development',
    },
  },
  (argv) => {
    // Workaround: Cleye has issues with nested commands matching.
    // If we land here, it means subcommands were not matched automatically.
    // We manually check for subcommands and dispatch to a new CLI instance.

    const subcommand = argv._[0];

    if (subcommand === 'create' || subcommand === 'list' || subcommand === 'remove') {
      const worktreeIndex = process.argv.indexOf('worktree');
      if (worktreeIndex !== -1) {
        const args = process.argv.slice(worktreeIndex + 1); // ['create', 'branch-name', '100', ...]

        cli(
          {
            commands: [
              createWorktreeCommand,
              listWorktreeCommand,
              removeWorktreeCommand,
            ],
          },
          undefined,
          args
        );
      }
    }
  }
);
