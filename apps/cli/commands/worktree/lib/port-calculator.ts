import { join, dirname } from 'path';
import type { PortConfig } from './types.js';
import { BASE_PORTS } from './types.js';
import { GitWorktree } from './git-worktree.js';

/**
 * Calculate ports with the given offset
 */
export function calculatePorts(offset: number): PortConfig {
  return {
    apiPort: BASE_PORTS.apiPort + offset,
    dashboardPort: BASE_PORTS.dashboardPort + offset,
    tradingServerPort: BASE_PORTS.tradingServerPort + offset,
    tradingClientPort: BASE_PORTS.tradingClientPort + offset,
  };
}

/**
 * Format ports as a displayable table
 */
export function formatPortTable(ports: PortConfig): string {
  return [
    `  API:            ${ports.apiPort}`,
    `  Dashboard:      ${ports.dashboardPort}`,
    `  Trading Server: ${ports.tradingServerPort}`,
    `  Trading Client: ${ports.tradingClientPort}`,
  ].join('\n');
}

/**
 * Validate that offset is a valid port offset
 */
export function isValidOffset(offset: number): boolean {
  return !isNaN(offset) && offset >= 0 && offset % 100 === 0;
}

/**
 * Read PORT_OFFSET from a worktree's .env file
 * Returns the last PORT_OFFSET value found (in case of duplicates)
 */
async function readPortOffset(worktreePath: string): Promise<number | null> {
  try {
    const envPath = join(worktreePath, '.env');
    const content = await Bun.file(envPath).text();
    // Find all PORT_OFFSET values and return the last one
    const matches = content.matchAll(/^PORT_OFFSET=(\d+)/gm);
    let lastOffset: number | null = null;
    for (const match of matches) {
      lastOffset = parseInt(match[1], 10);
    }
    return lastOffset;
  } catch {
    // File doesn't exist or can't be read
  }
  return null;
}

/**
 * Get all port offsets currently in use by worktrees
 */
export async function getUsedOffsets(repoRoot: string): Promise<Array<number>> {
  const gitWorktree = new GitWorktree(repoRoot);
  const worktrees = await gitWorktree.list();

  const offsets: Array<number> = [0]; // Main repo always uses offset 0

  for (const wt of worktrees) {
    // Skip the main worktree (it uses offset 0)
    if (wt.path === repoRoot) continue;

    const offset = await readPortOffset(wt.path);
    if (offset !== null) {
      offsets.push(offset);
    }
  }

  return offsets.sort((a, b) => a - b);
}

/**
 * Find the next available port offset
 * Starts at 100 and finds the first unused multiple of 100
 */
export async function getNextAvailableOffset(repoRoot: string): Promise<number> {
  const usedOffsets = new Set(await getUsedOffsets(repoRoot));

  // Start at 100 (0 is reserved for main repo)
  let offset = 100;
  while (usedOffsets.has(offset)) {
    offset += 100;
  }

  return offset;
}

/**
 * Format used offsets for display
 */
export function formatUsedOffsets(offsets: Array<number>): string {
  if (offsets.length <= 1) {
    return 'None in use';
  }
  // Filter out 0 (main repo) for display
  const worktreeOffsets = offsets.filter(o => o > 0);
  return worktreeOffsets.length > 0
    ? worktreeOffsets.join(', ')
    : 'None in use';
}
