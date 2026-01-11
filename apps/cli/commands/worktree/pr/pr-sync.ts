import { command } from 'cleye';
import * as p from '@clack/prompts';
import { GitHubPr } from '../lib/github-pr.js';

/**
 * PR Sync command - Sync worktree with latest PR/base branch changes
 *
 * Usage:
 *   cli worktree pr sync
 *   cli worktree pr sync --merge
 *   cli worktree pr sync --rebase --push
 */
export const prSyncCommand = command(
  {
    name: 'sync',
    flags: {
      rebase: {
        type: Boolean,
        description: 'Use rebase strategy (default)',
        alias: 'r',
        default: false,
      },
      merge: {
        type: Boolean,
        description: 'Use merge strategy instead of rebase',
        alias: 'm',
        default: false,
      },
      push: {
        type: Boolean,
        description: 'Push after successful sync',
        alias: 'p',
        default: false,
      },
      base: {
        type: String,
        description: 'Base branch to sync with (default: from PR or main)',
        alias: 'b',
      },
    },
    help: {
      description: 'Sync worktree with latest PR/base branch changes',
    },
  },
  async (argv) => {
    p.intro('Sync PR Branch');

    const repoRoot = process.cwd();
    const githubPr = new GitHubPr(repoRoot);

    // Determine strategy (default to rebase)
    const strategy: 'rebase' | 'merge' = argv.flags.merge ? 'merge' : 'rebase';

    // Get current branch
    const spinner = p.spinner();
    spinner.start('Getting branch info...');

    const currentBranch = await githubPr.getCurrentBranch();

    if (currentBranch === 'main' || currentBranch === 'master') {
      spinner.stop('On main branch');
      p.log.error('Cannot sync from main/master branch. Switch to a feature branch.');
      p.outro('Sync cancelled');
      process.exit(1);
    }

    spinner.stop(`Branch: ${currentBranch}`);

    // Determine base branch
    let baseBranch = argv.flags.base;

    if (!baseBranch) {
      // Try to get base from PR
      spinner.start('Checking for associated PR...');
      const prInfo = await githubPr.getPrInfo(currentBranch);

      if (prInfo) {
        baseBranch = prInfo.baseRefName;
        spinner.stop(`PR #${prInfo.number} found, base: ${baseBranch}`);
      } else {
        baseBranch = 'main';
        spinner.stop(`No PR found, using default base: ${baseBranch}`);
      }
    }

    // Display sync plan
    p.note(
      [
        `Branch: ${currentBranch}`,
        `Base: ${baseBranch}`,
        `Strategy: ${strategy}`,
        argv.flags.push ? 'Push: Yes' : 'Push: No',
      ].join('\n'),
      'Sync Plan'
    );

    // Confirm
    const confirmed = await p.confirm({
      message: `Sync with ${baseBranch} using ${strategy}?`,
      initialValue: true,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel('Sync cancelled');
      process.exit(0);
    }

    // Perform sync
    spinner.start(`Fetching and ${strategy}ing with ${baseBranch}...`);

    const result = await githubPr.syncWithBase({
      strategy,
      baseBranch,
    });

    if (result.conflicts) {
      spinner.stop('Conflicts detected');

      p.log.error('Merge conflicts detected in:');
      for (const file of result.conflictFiles) {
        p.log.error(`  - ${file}`);
      }

      p.note(
        [
          'To resolve conflicts:',
          '  1. Fix conflicts in the listed files',
          '  2. Stage resolved files: git add <file>',
          strategy === 'rebase'
            ? '  3. Continue rebase: git rebase --continue'
            : '  3. Complete merge: git commit',
          '',
          'To abort:',
          strategy === 'rebase'
            ? '  git rebase --abort'
            : '  git merge --abort',
        ].join('\n'),
        'Conflict Resolution'
      );

      p.outro('Sync incomplete - resolve conflicts manually');
      process.exit(1);
    }

    if (!result.success) {
      spinner.stop('Sync failed');
      p.log.error('Failed to sync branch. Check git status for details.');
      p.outro('Sync failed');
      process.exit(1);
    }

    spinner.stop('Branch synced');

    // Push if requested
    if (argv.flags.push) {
      spinner.start('Pushing to remote...');
      try {
        // Force push may be needed after rebase
        if (strategy === 'rebase') {
          const shouldForce = await p.confirm({
            message: 'Rebase may require force push. Force push?',
            initialValue: true,
          });

          if (p.isCancel(shouldForce)) {
            p.cancel('Push cancelled');
            process.exit(0);
          }

          if (shouldForce) {
            const { $ } = await import('bun');
            await $`git push --force-with-lease`.cwd(repoRoot);
          } else {
            await githubPr.pushBranch();
          }
        } else {
          await githubPr.pushBranch();
        }
        spinner.stop('Pushed to remote');
      } catch (error) {
        spinner.stop('Push failed');
        p.log.error(error instanceof Error ? error.message : 'Push failed');
        p.log.info('You may need to force push after rebase: git push --force-with-lease');
      }
    }

    p.note(
      [
        `Branch '${currentBranch}' is now up to date with '${baseBranch}'`,
        '',
        argv.flags.push ? 'Changes pushed to remote.' : 'Run `git push` to update remote.',
      ].join('\n'),
      'Sync Complete'
    );

    p.outro('Done!');
  }
);
