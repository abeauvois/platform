# Fixing Outdated Dependabot PRs

This document describes the process for fixing Dependabot PRs that fail CI due to being out of sync with the main branch.

## Problem

Dependabot PRs can fail when:
1. The PR branch is outdated and missing recent changes from main
2. Lockfile format has changed (e.g., `bun.lockb` → `bun.lock`)
3. Dockerfile references have been updated in main but not in the PR branch

## Common Error Messages

```
error: lockfile had changes, but lockfile is frozen
```

```
buildx failed with: ERROR: failed to build: failed to solve: failed to compute cache key:
"/bun.lockb": not found
```

```
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
"/app/apps/api/node_modules": not found
```

## Solution Steps

### 1. Checkout the Dependabot PR branch

```bash
gh pr checkout <PR_NUMBER>
# Example:
gh pr checkout 20
```

### 2. Merge main into the PR branch

```bash
git merge main -m "chore: merge main to update Dockerfiles and lockfile format"
```

### 3. Regenerate the lockfile

```bash
bun install
```

### 4. Commit and push the updated lockfile

```bash
git add bun.lock
git commit -m "chore: update bun.lock after merge"
git push origin <BRANCH_NAME>
```

### 5. Fix any remaining Dockerfile issues

If you see errors about missing `node_modules` directories:

```bash
# Check what the Dockerfile is trying to copy
grep "node_modules" apps/*/Dockerfile

# With Bun workspaces, dependencies are hoisted to root
# Remove any lines like:
# COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
```

### 6. Commit Dockerfile fixes

```bash
git add apps/api/Dockerfile
git commit -m "fix(docker): remove non-existent apps/api/node_modules copy"
git push origin <BRANCH_NAME>
```

### 7. Switch back to main and monitor CI

```bash
git checkout main
gh pr checks <PR_NUMBER>
```

## Quick Reference Commands

```bash
# List open Dependabot PRs
gh pr list --author "app/dependabot"

# View PR details
gh pr view <PR_NUMBER>

# Check CI status
gh pr checks <PR_NUMBER>

# View failed CI logs
gh run view <RUN_ID> --log-failed

# Checkout, update, and push in one flow
gh pr checkout 20 && \
git merge main -m "chore: merge main" && \
bun install && \
git add bun.lock && \
git commit -m "chore: update lockfile" && \
git push
```

## Prevention

To prevent these issues:

1. **Keep Dependabot PRs up to date** - Merge or close stale PRs promptly
2. **Use branch protection** - Require branches to be up to date before merging
3. **Configure Dependabot rebasing** - Add to `.github/dependabot.yml`:
   ```yaml
   rebase-strategy: "auto"
   ```
