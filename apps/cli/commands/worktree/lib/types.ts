/**
 * Port configuration for a worktree instance
 */
export interface PortConfig {
  apiPort: number;
  dashboardPort: number;
  tradingServerPort: number;
  tradingClientPort: number;
}

/**
 * Base ports for the platform
 */
export const BASE_PORTS: PortConfig = {
  apiPort: 3000,
  dashboardPort: 5000,
  tradingServerPort: 3001,
  tradingClientPort: 5001,
};

/**
 * Environment files that should be copied to worktrees
 */
export const ENV_FILES = [
  '.env',
  'apps/api/.env',
  'apps/dashboard/.env',
  'apps/trading/.env',
  'packages/platform-db/.env',
] as const;

/**
 * Result of a worktree creation operation
 */
export interface WorktreeCreateResult {
  name: string;
  path: string;
  ports: PortConfig;
  isNewBranch: boolean;
}

/**
 * Parsed worktree information from git
 */
export interface WorktreeInfo {
  path: string;
  head: string;
  branch: string | null;
  locked: boolean;
  prunable: boolean;
}

/**
 * Warp Launch Configuration structure
 */
export interface WarpLaunchConfig {
  name: string;
  windows: Array<WarpWindow>;
}

export interface WarpWindow {
  tabs: Array<WarpTab>;
}

export interface WarpTab {
  title: string;
  color?: 'Red' | 'Green' | 'Yellow' | 'Blue' | 'Magenta' | 'Cyan';
  layout: WarpLayout;
}

export interface WarpLayout {
  cwd: string;
  commands?: Array<{ exec: string }>;
}

// Re-export PR types from github-pr.ts for convenience
export type { PrInfo, PrCheck, PrReview } from './github-pr.js';
