import { command } from 'cleye';
import * as p from '@clack/prompts';
import { GitWorktree } from './lib/git-worktree.js';

/**
 * List worktrees command - Lists all git worktrees
 *
 * Usage:
 *   cli worktree list
 */
export const listWorktreeCommand = command(
  {
    name: 'list',
    help: {
      description: 'List all git worktrees',
    },
  },
  async () => {
    p.intro('Git Worktrees');

    try {
      const gitWorktree = new GitWorktree(process.cwd());
      const worktrees = await gitWorktree.list();

      if (worktrees.length === 0) {
        p.log.info('No worktrees found');
      } else {
        const table = worktrees
          .map((wt) => {
            const branch = wt.branch || '(detached)';
            const head = wt.head.slice(0, 8);
            const status: Array<string> = [];
            if (wt.locked) status.push('locked');
            if (wt.prunable) status.push('prunable');
            const statusStr = status.length > 0 ? ` [${status.join(', ')}]` : '';

            return `${branch}${statusStr}\n  Path: ${wt.path}\n  HEAD: ${head}`;
          })
          .join('\n\n');

        p.note(table, `${worktrees.length} worktree(s)`);
      }

      p.outro('');
    } catch (error) {
      p.log.error(error instanceof Error ? error.message : 'Unknown error');
      p.outro('Failed to list worktrees');
      process.exit(1);
    }
  }
);
