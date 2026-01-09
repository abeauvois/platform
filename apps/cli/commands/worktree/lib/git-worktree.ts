import { $ } from 'bun';
import type { WorktreeInfo } from './types.js';

/**
 * Git worktree operations using Bun shell
 */
export class GitWorktree {
  constructor(private readonly repoRoot: string) {}

  /**
   * Create a new worktree, trying new branch first, then existing
   */
  async create(
    worktreePath: string,
    branchName: string
  ): Promise<{ isNewBranch: boolean }> {
    try {
      // Try creating new branch
      await $`git -C ${this.repoRoot} worktree add ${worktreePath} -b ${branchName}`.quiet();
      return { isNewBranch: true };
    } catch {
      // Fall back to existing branch
      await $`git -C ${this.repoRoot} worktree add ${worktreePath} ${branchName}`;
      return { isNewBranch: false };
    }
  }

  /**
   * List all worktrees with parsed information
   */
  async list(): Promise<Array<WorktreeInfo>> {
    const result =
      await $`git -C ${this.repoRoot} worktree list --porcelain`.text();
    return this.parseWorktreeList(result);
  }

  /**
   * Remove a worktree
   */
  async remove(worktreePath: string, force = true): Promise<void> {
    if (force) {
      await $`git -C ${this.repoRoot} worktree remove ${worktreePath} --force`;
    } else {
      await $`git -C ${this.repoRoot} worktree remove ${worktreePath}`;
    }
  }

  /**
   * Delete a branch (tries -d first, then -D)
   */
  async deleteBranch(branchName: string): Promise<boolean> {
    try {
      await $`git -C ${this.repoRoot} branch -d ${branchName}`.quiet();
      return true;
    } catch {
      try {
        await $`git -C ${this.repoRoot} branch -D ${branchName}`.quiet();
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Parse git worktree list --porcelain output
   */
  private parseWorktreeList(output: string): Array<WorktreeInfo> {
    const worktrees: Array<WorktreeInfo> = [];
    const blocks = output.trim().split('\n\n');

    for (const block of blocks) {
      if (!block.trim()) continue;

      const lines = block.split('\n');
      const info: Partial<WorktreeInfo> = {
        locked: false,
        prunable: false,
      };

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          info.path = line.slice(9);
        } else if (line.startsWith('HEAD ')) {
          info.head = line.slice(5);
        } else if (line.startsWith('branch ')) {
          info.branch = line.slice(7).replace('refs/heads/', '');
        } else if (line === 'locked') {
          info.locked = true;
        } else if (line === 'prunable') {
          info.prunable = true;
        }
      }

      if (info.path && info.head) {
        worktrees.push({
          path: info.path,
          head: info.head,
          branch: info.branch ?? null,
          locked: info.locked ?? false,
          prunable: info.prunable ?? false,
        });
      }
    }

    return worktrees;
  }
}
