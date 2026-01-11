import { $ } from 'bun';

/**
 * GitHub PR information
 */
export interface PrInfo {
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  headRefName: string;
  baseRefName: string;
  url: string;
  isDraft: boolean;
  author: string;
}

/**
 * PR check/CI status
 */
export interface PrCheck {
  name: string;
  status: 'pending' | 'pass' | 'fail' | 'skipped';
  conclusion: string | null;
}

/**
 * PR review status
 */
export interface PrReview {
  author: string;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'PENDING';
}

/**
 * GitHub CLI wrapper for PR operations
 */
export class GitHubPr {
  constructor(private readonly repoRoot: string) {}

  /**
   * Check if gh CLI is installed and authenticated
   */
  async checkGhInstalled(): Promise<{ installed: boolean; authenticated: boolean }> {
    try {
      // Check if gh is installed
      const versionResult = await $`gh --version`.quiet().nothrow();
      if (versionResult.exitCode !== 0) {
        return { installed: false, authenticated: false };
      }

      // Check if authenticated
      const authResult = await $`gh auth status`.quiet().nothrow();
      return {
        installed: true,
        authenticated: authResult.exitCode === 0,
      };
    } catch {
      return { installed: false, authenticated: false };
    }
  }

  /**
   * Create a new PR
   */
  async createPr(options: {
    title: string;
    body?: string;
    draft?: boolean;
    base?: string;
  }): Promise<{ url: string; number: number }> {
    const args: Array<string> = ['pr', 'create', '--title', options.title];

    if (options.body) {
      args.push('--body', options.body);
    }
    if (options.draft) {
      args.push('--draft');
    }
    if (options.base) {
      args.push('--base', options.base);
    }

    const result = await $`gh ${args}`.cwd(this.repoRoot).text();
    const url = result.trim();

    // Extract PR number from URL
    const match = url.match(/\/pull\/(\d+)/);
    const number = match ? parseInt(match[1], 10) : 0;

    return { url, number };
  }

  /**
   * Get PR information by number or branch
   */
  async getPrInfo(prNumberOrBranch: number | string): Promise<PrInfo | null> {
    try {
      const identifier =
        typeof prNumberOrBranch === 'number'
          ? prNumberOrBranch.toString()
          : prNumberOrBranch;

      const result = await $`gh pr view ${identifier} --json number,title,state,headRefName,baseRefName,url,isDraft,author`
        .cwd(this.repoRoot)
        .quiet()
        .nothrow();

      if (result.exitCode !== 0) {
        return null;
      }

      const data = JSON.parse(result.stdout.toString());
      return {
        number: data.number,
        title: data.title,
        state: data.state,
        headRefName: data.headRefName,
        baseRefName: data.baseRefName,
        url: data.url,
        isDraft: data.isDraft,
        author: data.author?.login || 'unknown',
      };
    } catch {
      return null;
    }
  }

  /**
   * Get PR branch name from PR number
   */
  async getPrBranch(prNumber: number): Promise<string> {
    const info = await this.getPrInfo(prNumber);
    if (!info) {
      throw new Error(`PR #${prNumber} not found`);
    }
    return info.headRefName;
  }

  /**
   * Fetch PR branch to local repository
   */
  async fetchPrBranch(prNumber: number): Promise<{ branchName: string }> {
    const branchName = await this.getPrBranch(prNumber);

    // Fetch the PR branch
    await $`git fetch origin ${branchName}:${branchName}`.cwd(this.repoRoot).quiet().nothrow();

    return { branchName };
  }

  /**
   * Get PR checks/CI status
   */
  async getPrChecks(prNumberOrBranch: number | string): Promise<Array<PrCheck>> {
    try {
      const identifier =
        typeof prNumberOrBranch === 'number'
          ? prNumberOrBranch.toString()
          : prNumberOrBranch;

      const result = await $`gh pr checks ${identifier} --json name,state,conclusion`
        .cwd(this.repoRoot)
        .quiet()
        .nothrow();

      if (result.exitCode !== 0) {
        // No checks or PR not found
        return [];
      }

      const data = JSON.parse(result.stdout.toString());
      return data.map((check: { name: string; state: string; conclusion: string | null }) => ({
        name: check.name,
        status: this.mapCheckStatus(check.state, check.conclusion),
        conclusion: check.conclusion,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get PR reviews
   */
  async getPrReviews(prNumber: number): Promise<Array<PrReview>> {
    try {
      const result = await $`gh pr view ${prNumber} --json reviews`
        .cwd(this.repoRoot)
        .quiet()
        .nothrow();

      if (result.exitCode !== 0) {
        return [];
      }

      const data = JSON.parse(result.stdout.toString());
      if (!data.reviews || !Array.isArray(data.reviews)) {
        return [];
      }

      return data.reviews.map((review: { author: { login: string }; state: string }) => ({
        author: review.author?.login || 'unknown',
        state: review.state as PrReview['state'],
      }));
    } catch {
      return [];
    }
  }

  /**
   * Sync local branch with remote (fetch + rebase or merge)
   */
  async syncWithBase(options: {
    strategy: 'rebase' | 'merge';
    baseBranch?: string;
  }): Promise<{ success: boolean; conflicts: boolean; conflictFiles: Array<string> }> {
    const baseBranch = options.baseBranch || 'main';

    try {
      // Fetch latest from remote
      await $`git fetch origin`.cwd(this.repoRoot).quiet();

      // Perform rebase or merge
      if (options.strategy === 'rebase') {
        const result = await $`git rebase origin/${baseBranch}`
          .cwd(this.repoRoot)
          .quiet()
          .nothrow();

        if (result.exitCode !== 0) {
          // Check for conflicts
          const conflictFiles = await this.getConflictFiles();
          if (conflictFiles.length > 0) {
            return { success: false, conflicts: true, conflictFiles };
          }
          return { success: false, conflicts: false, conflictFiles: [] };
        }
      } else {
        const result = await $`git merge origin/${baseBranch}`
          .cwd(this.repoRoot)
          .quiet()
          .nothrow();

        if (result.exitCode !== 0) {
          const conflictFiles = await this.getConflictFiles();
          if (conflictFiles.length > 0) {
            return { success: false, conflicts: true, conflictFiles };
          }
          return { success: false, conflicts: false, conflictFiles: [] };
        }
      }

      return { success: true, conflicts: false, conflictFiles: [] };
    } catch {
      return { success: false, conflicts: false, conflictFiles: [] };
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    const result = await $`git rev-parse --abbrev-ref HEAD`.cwd(this.repoRoot).text();
    return result.trim();
  }

  /**
   * Check if current branch has been pushed to remote
   */
  async isBranchPushed(branchName?: string): Promise<boolean> {
    const branch = branchName || (await this.getCurrentBranch());
    const result = await $`git ls-remote --heads origin ${branch}`
      .cwd(this.repoRoot)
      .quiet()
      .nothrow();
    return result.stdout.toString().trim().length > 0;
  }

  /**
   * Push current branch to remote
   */
  async pushBranch(branchName?: string): Promise<void> {
    const branch = branchName || (await this.getCurrentBranch());
    await $`git push -u origin ${branch}`.cwd(this.repoRoot);
  }

  /**
   * Get list of files with conflicts
   */
  private async getConflictFiles(): Promise<Array<string>> {
    try {
      const result = await $`git diff --name-only --diff-filter=U`
        .cwd(this.repoRoot)
        .quiet()
        .nothrow();
      return result.stdout
        .toString()
        .trim()
        .split('\n')
        .filter((f) => f.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Map GitHub check state to our status enum
   */
  private mapCheckStatus(
    state: string,
    conclusion: string | null
  ): PrCheck['status'] {
    if (state === 'PENDING' || state === 'IN_PROGRESS') {
      return 'pending';
    }
    if (state === 'COMPLETED') {
      if (conclusion === 'SUCCESS') return 'pass';
      if (conclusion === 'FAILURE') return 'fail';
      if (conclusion === 'SKIPPED') return 'skipped';
    }
    return 'pending';
  }

  /**
   * Abort an in-progress rebase
   */
  async abortRebase(): Promise<void> {
    await $`git rebase --abort`.cwd(this.repoRoot).quiet().nothrow();
  }

  /**
   * Abort an in-progress merge
   */
  async abortMerge(): Promise<void> {
    await $`git merge --abort`.cwd(this.repoRoot).quiet().nothrow();
  }
}
