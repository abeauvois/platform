import { command, cli } from 'cleye';
import { createWorktreeCommand } from './create-worktree.js';
import { listWorktreeCommand } from './list-worktree.js';
import { removeWorktreeCommand } from './remove-worktree.js';
import { prCommand } from './pr/index.js';

const allCommands = [
  createWorktreeCommand,
  listWorktreeCommand,
  removeWorktreeCommand,
  prCommand,
];

/**
 * Worktree command - Manage git worktrees for parallel development
 *
 * Usage:
 *   cli worktree create <branch-name> [port-offset]
 *   cli worktree list
 *   cli worktree remove <branch-name>
 *   cli worktree pr create [--title "Title"] [--draft]
 *   cli worktree pr checkout <pr-number> [port-offset]
 *   cli worktree pr status [branch-name]
 *   cli worktree pr sync [--rebase | --merge]
 */
export const worktreeCommand = command(
  {
    name: 'worktree',
    commands: allCommands,
    help: {
      description: 'Manage git worktrees for parallel development',
    },
  },
  (argv) => {
    // Workaround: Cleye has issues with nested commands matching.
    // We need to manually dispatch to subcommands.

    const worktreeIndex = process.argv.indexOf('worktree');
    if (worktreeIndex === -1) return;

    const args = process.argv.slice(worktreeIndex + 1);

    // Find the subcommand (first non-flag argument)
    const subcommand = args.find((arg) => !arg.startsWith('-'));

    if (subcommand && ['create', 'list', 'remove', 'pr'].includes(subcommand)) {
      cli(
        {
          name: 'worktree',
          commands: allCommands,
        },
        undefined,
        args
      );
    }
  }
);

// Early interception for help flags with subcommands
// This runs when the module is imported, before cleye processes flags
function maybeDispatchWithHelp(): void {
  const args = process.argv;
  const worktreeIndex = args.indexOf('worktree');

  if (worktreeIndex === -1) return;

  const worktreeArgs = args.slice(worktreeIndex + 1);

  // Check if there's a subcommand followed by or preceded by a help flag
  const hasHelp = worktreeArgs.some((arg) => arg === '-h' || arg === '--help');
  const subcommand = worktreeArgs.find((arg) => !arg.startsWith('-'));

  if (hasHelp && subcommand && ['create', 'list', 'remove', 'pr'].includes(subcommand)) {
    // Dispatch to nested CLI which will show the correct help
    cli(
      {
        name: 'worktree',
        commands: allCommands,
      },
      undefined,
      worktreeArgs
    );
    process.exit(0);
  }
}

maybeDispatchWithHelp();
