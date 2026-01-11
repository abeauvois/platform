import { command } from 'cleye';
import * as p from '@clack/prompts';
import { GitHubPr } from '../lib/github-pr.js';
import type { PrCheck, PrReview } from '../lib/github-pr.js';

/**
 * PR Status command - Show PR status and checks for a worktree branch
 *
 * Usage:
 *   cli worktree pr status
 *   cli worktree pr status feature-branch
 *   cli worktree pr status --checks
 */
export const prStatusCommand = command(
  {
    name: 'status',
    parameters: ['[branch-name]'],
    flags: {
      checks: {
        type: Boolean,
        description: 'Show detailed CI checks',
        alias: 'c',
        default: false,
      },
    },
    help: {
      description: 'Show PR status for a worktree branch',
    },
  },
  async (argv) => {
    p.intro('PR Status');

    const repoRoot = process.cwd();
    const githubPr = new GitHubPr(repoRoot);

    // Check gh CLI is available
    const spinner = p.spinner();
    spinner.start('Checking GitHub CLI...');

    const { installed, authenticated } = await githubPr.checkGhInstalled();

    if (!installed) {
      spinner.stop('GitHub CLI not found');
      p.log.error(
        'GitHub CLI (gh) is not installed.\nInstall from: https://cli.github.com/'
      );
      p.outro('Status check cancelled');
      process.exit(1);
    }

    if (!authenticated) {
      spinner.stop('GitHub CLI not authenticated');
      p.log.error('GitHub CLI is not authenticated.\nRun: gh auth login');
      p.outro('Status check cancelled');
      process.exit(1);
    }

    spinner.stop('GitHub CLI ready');

    // Get branch name
    let branchName = argv._.branchName;
    if (!branchName) {
      branchName = await githubPr.getCurrentBranch();
    }

    p.log.info(`Branch: ${branchName}`);

    // Get PR info
    spinner.start('Fetching PR info...');
    const prInfo = await githubPr.getPrInfo(branchName);

    if (!prInfo) {
      spinner.stop('No PR found');
      p.log.warn(`No PR found for branch '${branchName}'`);
      p.outro('');
      process.exit(0);
    }

    spinner.stop('PR found');

    // Get reviews and checks
    const [reviews, checks] = await Promise.all([
      githubPr.getPrReviews(prInfo.number),
      argv.flags.checks ? githubPr.getPrChecks(prInfo.number) : Promise.resolve([]),
    ]);

    // Build output
    const lines: Array<string> = [];

    // PR Header
    lines.push(`PR #${prInfo.number}: ${prInfo.title}`);
    lines.push('');

    // State
    const stateDisplay = prInfo.isDraft
      ? `${prInfo.state} (draft)`
      : prInfo.state;
    lines.push(`State: ${stateDisplay}`);
    lines.push(`Author: ${prInfo.author}`);
    lines.push(`Base: ${prInfo.baseRefName} <- ${prInfo.headRefName}`);
    lines.push(`URL: ${prInfo.url}`);

    // Reviews
    if (reviews.length > 0) {
      lines.push('');
      lines.push('Reviews:');
      for (const review of reviews) {
        const icon = getReviewIcon(review.state);
        lines.push(`  ${icon} @${review.author}: ${review.state}`);
      }
    } else {
      lines.push('');
      lines.push('Reviews: None');
    }

    // CI Checks (if requested)
    if (argv.flags.checks) {
      lines.push('');
      if (checks.length > 0) {
        lines.push('CI Checks:');
        for (const check of checks) {
          const icon = getCheckIcon(check.status);
          lines.push(`  ${icon} ${check.name}: ${check.status.toUpperCase()}`);
        }

        // Summary
        const passed = checks.filter((c) => c.status === 'pass').length;
        const failed = checks.filter((c) => c.status === 'fail').length;
        const pending = checks.filter((c) => c.status === 'pending').length;
        lines.push('');
        lines.push(
          `Summary: ${passed} passed, ${failed} failed, ${pending} pending`
        );
      } else {
        lines.push('CI Checks: None');
      }
    } else {
      // Quick summary without details
      const quickChecks = await githubPr.getPrChecks(prInfo.number);
      if (quickChecks.length > 0) {
        const passed = quickChecks.filter((c) => c.status === 'pass').length;
        const failed = quickChecks.filter((c) => c.status === 'fail').length;
        const pending = quickChecks.filter((c) => c.status === 'pending').length;
        lines.push('');
        lines.push(
          `CI: ${passed} passed, ${failed} failed, ${pending} pending (use --checks for details)`
        );
      }
    }

    p.note(lines.join('\n'), 'Pull Request Status');
    p.outro('');
  }
);

function getReviewIcon(state: PrReview['state']): string {
  switch (state) {
    case 'APPROVED':
      return '[OK]';
    case 'CHANGES_REQUESTED':
      return '[!!]';
    case 'COMMENTED':
      return '[--]';
    case 'PENDING':
      return '[..]';
    default:
      return '[??]';
  }
}

function getCheckIcon(status: PrCheck['status']): string {
  switch (status) {
    case 'pass':
      return '[OK]';
    case 'fail':
      return '[!!]';
    case 'pending':
      return '[..]';
    case 'skipped':
      return '[--]';
    default:
      return '[??]';
  }
}
