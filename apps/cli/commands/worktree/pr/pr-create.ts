import { command } from 'cleye';
import * as p from '@clack/prompts';
import { GitHubPr } from '../lib/github-pr.js';

/**
 * Create PR command - Create a GitHub PR from the current worktree branch
 *
 * Usage:
 *   cli worktree pr create
 *   cli worktree pr create --title "Add feature" --body "Description" --draft
 */
export const prCreateCommand = command(
  {
    name: 'create',
    flags: {
      title: {
        type: String,
        description: 'PR title',
        alias: 't',
      },
      body: {
        type: String,
        description: 'PR body/description',
        alias: 'b',
      },
      draft: {
        type: Boolean,
        description: 'Create as draft PR',
        alias: 'd',
        default: false,
      },
      base: {
        type: String,
        description: 'Base branch for PR (default: main)',
        default: 'main',
      },
    },
    help: {
      description: 'Create a GitHub PR from the current worktree branch',
    },
  },
  async (argv) => {
    p.intro('Create GitHub PR');

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
      p.outro('PR creation cancelled');
      process.exit(1);
    }

    if (!authenticated) {
      spinner.stop('GitHub CLI not authenticated');
      p.log.error('GitHub CLI is not authenticated.\nRun: gh auth login');
      p.outro('PR creation cancelled');
      process.exit(1);
    }

    spinner.stop('GitHub CLI ready');

    // Get current branch
    const currentBranch = await githubPr.getCurrentBranch();

    if (currentBranch === 'main' || currentBranch === 'master') {
      p.log.error(`Cannot create PR from ${currentBranch} branch`);
      p.outro('PR creation cancelled');
      process.exit(1);
    }

    p.log.info(`Branch: ${currentBranch}`);

    // Check if branch is pushed
    spinner.start('Checking remote branch...');
    const isPushed = await githubPr.isBranchPushed(currentBranch);
    spinner.stop(isPushed ? 'Branch exists on remote' : 'Branch not pushed');

    if (!isPushed) {
      const shouldPush = await p.confirm({
        message: `Branch '${currentBranch}' has not been pushed. Push now?`,
        initialValue: true,
      });

      if (p.isCancel(shouldPush) || !shouldPush) {
        p.cancel('PR creation cancelled');
        process.exit(0);
      }

      spinner.start('Pushing branch...');
      try {
        await githubPr.pushBranch(currentBranch);
        spinner.stop('Branch pushed');
      } catch (error) {
        spinner.stop('Failed to push branch');
        p.log.error(error instanceof Error ? error.message : 'Push failed');
        p.outro('PR creation cancelled');
        process.exit(1);
      }
    }

    // Get PR title
    let title = argv.flags.title;
    if (!title) {
      const inputTitle = await p.text({
        message: 'PR title:',
        placeholder: 'Add new feature',
        validate: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Title is required';
          }
        },
      });

      if (p.isCancel(inputTitle)) {
        p.cancel('PR creation cancelled');
        process.exit(0);
      }

      title = inputTitle as string;
    }

    // Get PR body (optional)
    let body = argv.flags.body;
    if (!body) {
      const inputBody = await p.text({
        message: 'PR description (optional):',
        placeholder: 'Describe your changes...',
      });

      if (p.isCancel(inputBody)) {
        p.cancel('PR creation cancelled');
        process.exit(0);
      }

      body = (inputBody as string) || undefined;
    }

    // Create PR
    spinner.start('Creating PR...');

    try {
      const { url, number } = await githubPr.createPr({
        title,
        body,
        draft: argv.flags.draft,
        base: argv.flags.base,
      });

      spinner.stop('PR created');

      p.note(
        [
          `PR #${number}: ${title}`,
          argv.flags.draft ? 'Status: Draft' : 'Status: Open',
          `Base: ${argv.flags.base}`,
          '',
          `URL: ${url}`,
        ].join('\n'),
        'Pull Request Created'
      );

      p.outro('Done!');
    } catch (error) {
      spinner.stop('Failed to create PR');
      p.log.error(error instanceof Error ? error.message : 'Unknown error');
      p.outro('PR creation failed');
      process.exit(1);
    }
  }
);
