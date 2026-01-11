import { command } from 'cleye';
import * as p from '@clack/prompts';
import { $ } from 'bun';
import { GitHubPr } from '../lib/github-pr.js';
import { GitWorktree } from '../lib/git-worktree.js';

/**
 * PR List command - List PRs associated with worktrees
 *
 * Usage:
 *   cli worktree pr list              # PRs with worktrees only
 *   cli worktree pr list --all        # All open PRs
 *   cli worktree pr list --all --author @me
 */
export const prListCommand = command(
  {
    name: 'list',
    flags: {
      all: {
        type: Boolean,
        description: 'Show all open PRs (not just those with worktrees)',
        default: false,
      },
      author: {
        type: String,
        description: 'Filter by author (use @me for your PRs)',
        alias: 'a',
      },
      limit: {
        type: Number,
        description: 'Maximum number of PRs to show',
        alias: 'l',
        default: 50,
      },
    },
    help: {
      description: 'List PRs associated with worktrees (use --all for all open PRs)',
    },
  },
  async (argv) => {
    const showAll = argv.flags.all;
    p.intro(showAll ? 'List All Open PRs' : 'List Worktree PRs');

    const repoRoot = process.cwd();
    const githubPr = new GitHubPr(repoRoot);
    const gitWorktree = new GitWorktree(repoRoot);

    // Check gh CLI is available
    const spinner = p.spinner();
    spinner.start('Checking GitHub CLI...');

    const { installed, authenticated } = await githubPr.checkGhInstalled();

    if (!installed) {
      spinner.stop('GitHub CLI not found');
      p.log.error(
        'GitHub CLI (gh) is not installed.\nInstall from: https://cli.github.com/'
      );
      p.outro('List cancelled');
      process.exit(1);
    }

    if (!authenticated) {
      spinner.stop('GitHub CLI not authenticated');
      p.log.error('GitHub CLI is not authenticated.\nRun: gh auth login');
      p.outro('List cancelled');
      process.exit(1);
    }

    spinner.stop('GitHub CLI ready');

    // Get worktree branches if not showing all
    let worktreeBranches: Set<string> = new Set();
    if (!showAll) {
      spinner.start('Getting worktrees...');
      const worktrees = await gitWorktree.list();
      worktreeBranches = new Set(
        worktrees
          .filter((wt) => wt.branch !== null)
          .map((wt) => wt.branch as string)
      );
      spinner.stop(`Found ${worktreeBranches.size} worktree(s)`);

      if (worktreeBranches.size === 0) {
        p.log.info('No worktrees found. Use --all to see all open PRs.');
        p.outro('');
        return;
      }
    }

    // Build gh pr list command
    const args: Array<string> = ['pr', 'list', '--json', 'number,title,state,headRefName,author,isDraft,updatedAt'];

    if (argv.flags.author) {
      args.push('--author', argv.flags.author);
    }

    args.push('--limit', String(argv.flags.limit));

    spinner.start('Fetching PRs...');

    try {
      const result = await $`gh ${args}`.cwd(repoRoot).quiet().nothrow();

      if (result.exitCode !== 0) {
        spinner.stop('Failed to fetch PRs');
        p.log.error('Could not fetch PRs. Check your GitHub CLI configuration.');
        p.outro('');
        process.exit(1);
      }

      let prs = JSON.parse(result.stdout.toString());

      // Filter to only worktree PRs if not showing all
      if (!showAll) {
        prs = prs.filter((pr: { headRefName: string }) =>
          worktreeBranches.has(pr.headRefName)
        );
      }

      spinner.stop(`Found ${prs.length} PR(s)`);

      if (prs.length === 0) {
        if (showAll) {
          p.log.info('No open PRs found');
        } else {
          p.log.info('No PRs found for existing worktrees. Use --all to see all open PRs.');
        }
        p.outro('');
        return;
      }

      // Format output
      const lines: Array<string> = [];

      for (const pr of prs) {
        const stateIcon = getStateIcon(pr.state, pr.isDraft);
        const author = pr.author?.login || 'unknown';
        const branch = pr.headRefName;
        const hasWorktree = worktreeBranches.has(branch);

        lines.push(`${stateIcon} #${pr.number}: ${pr.title}`);
        if (showAll) {
          lines.push(`   Branch: ${branch} | Author: @${author}${hasWorktree ? ' | [worktree]' : ''}`);
        } else {
          lines.push(`   Branch: ${branch} | Author: @${author}`);
        }
        lines.push('');
      }

      // Remove trailing empty line
      if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
      }

      const title = showAll ? 'All Open PRs' : 'Worktree PRs';
      p.note(lines.join('\n'), title);
      p.outro('');
    } catch (error) {
      spinner.stop('Error');
      p.log.error(error instanceof Error ? error.message : 'Unknown error');
      p.outro('');
      process.exit(1);
    }
  }
);

function getStateIcon(state: string, isDraft: boolean): string {
  if (isDraft) return '[draft]';
  switch (state) {
    case 'OPEN':
      return '[open]';
    case 'CLOSED':
      return '[closed]';
    case 'MERGED':
      return '[merged]';
    default:
      return `[${state.toLowerCase()}]`;
  }
}
