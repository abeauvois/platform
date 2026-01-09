import { command } from 'cleye';
import * as p from '@clack/prompts';
import { join, dirname } from 'path';
import { GitWorktree } from './lib/git-worktree.js';
import { WarpLauncher } from './lib/warp-launcher.js';

/**
 * Remove worktree command - Removes a git worktree
 *
 * Usage:
 *   cli worktree remove feature-auth
 *   cli worktree remove feature-auth --delete-branch
 */
export const removeWorktreeCommand = command(
  {
    name: 'remove',
    parameters: ['<branch-name>'],
    flags: {
      deleteBranch: {
        type: Boolean,
        description: 'Also delete the git branch',
        alias: 'd',
        default: false,
      },
      force: {
        type: Boolean,
        description: 'Force removal even if worktree has uncommitted changes',
        alias: 'f',
        default: true,
      },
    },
    help: {
      description: 'Remove a git worktree',
    },
  },
  async (argv) => {
    p.intro('Remove Git Worktree');

    const branchName = argv._.branchName;
    const repoRoot = process.cwd();
    const worktreesDir = join(dirname(repoRoot), 'platform-worktrees');
    const worktreePath = join(worktreesDir, branchName);

    const gitWorktree = new GitWorktree(repoRoot);
    const warpLauncher = new WarpLauncher();

    // Confirm removal
    const confirmed = await p.confirm({
      message: `Remove worktree "${branchName}" at ${worktreePath}?`,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    try {
      const spinner = p.spinner();

      // Remove worktree
      spinner.start('Removing worktree...');
      await gitWorktree.remove(worktreePath, argv.flags.force);
      spinner.stop('Worktree removed');

      // Clean up Warp config
      await warpLauncher.cleanup(branchName);

      // Handle branch deletion
      if (argv.flags.deleteBranch) {
        spinner.start('Deleting branch...');
        const deleted = await gitWorktree.deleteBranch(branchName);
        spinner.stop(
          deleted
            ? `Branch "${branchName}" deleted`
            : 'Could not delete branch (may be merged or not exist)'
        );
      } else {
        const shouldDelete = await p.confirm({
          message: `Delete branch "${branchName}"?`,
          initialValue: false,
        });

        if (!p.isCancel(shouldDelete) && shouldDelete) {
          const deleted = await gitWorktree.deleteBranch(branchName);
          p.log.info(
            deleted ? `Branch "${branchName}" deleted` : 'Could not delete branch'
          );
        }
      }

      p.outro('Worktree removed successfully');
    } catch (error) {
      p.log.error(error instanceof Error ? error.message : 'Unknown error');
      p.outro('Removal failed');
      process.exit(1);
    }
  }
);
