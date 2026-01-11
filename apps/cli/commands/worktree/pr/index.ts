import { command, cli } from 'cleye';
import { prCreateCommand } from './pr-create.js';
import { prCheckoutCommand } from './pr-checkout.js';
import { prListCommand } from './pr-list.js';
import { prStatusCommand } from './pr-status.js';
import { prSyncCommand } from './pr-sync.js';

const allPrCommands = [
  prListCommand,
  prCreateCommand,
  prCheckoutCommand,
  prStatusCommand,
  prSyncCommand,
];

/**
 * PR command - Manage GitHub PRs for worktrees
 *
 * Usage:
 *   cli worktree pr list [--author @me] [--all]
 *   cli worktree pr create [--title "Title"] [--draft]
 *   cli worktree pr checkout <pr-number> [port-offset]
 *   cli worktree pr status [branch-name]
 *   cli worktree pr sync [--rebase | --merge]
 */
export const prCommand = command(
  {
    name: 'pr',
    commands: allPrCommands,
    help: {
      description: 'Manage GitHub PRs for worktrees',
    },
  },
  (argv) => {
    // Workaround: Cleye has issues with deeply nested commands.
    // Manually dispatch to subcommands if not automatically matched.
    const subcommand = argv._[0];

    if (['list', 'create', 'checkout', 'status', 'sync'].includes(subcommand)) {
      const prIndex = process.argv.indexOf('pr');
      if (prIndex !== -1) {
        const args = process.argv.slice(prIndex + 1);

        cli(
          {
            name: 'pr',
            commands: allPrCommands,
          },
          undefined,
          args
        );
      }
    }
  }
);

// Early interception for help flags with subcommands
// This runs when the module is imported, before cleye processes flags
function maybeDispatchWithHelp(): void {
  const args = process.argv;
  const prIndex = args.indexOf('pr');

  if (prIndex === -1) return;

  const prArgs = args.slice(prIndex + 1);

  // Check if there's a subcommand followed by or preceded by a help flag
  const hasHelp = prArgs.some((arg) => arg === '-h' || arg === '--help');
  const subcommand = prArgs.find((arg) => !arg.startsWith('-'));

  if (hasHelp && subcommand && ['list', 'create', 'checkout', 'status', 'sync'].includes(subcommand)) {
    // Dispatch to nested CLI which will show the correct help
    cli(
      {
        name: 'pr',
        commands: allPrCommands,
      },
      undefined,
      prArgs
    );
    process.exit(0);
  }
}

maybeDispatchWithHelp();
