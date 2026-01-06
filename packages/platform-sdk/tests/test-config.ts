/**
 * Test configuration utilities
 *
 * Provides environment-aware URLs for tests, enabling tests to run
 * in different environments (default dev, worktrees with port offsets, CI)
 */

/**
 * Platform API URL for tests
 * Reads from environment or defaults to localhost:3000
 */
export const TEST_API_URL =
  process.env.API_URL || `http://localhost:${process.env.API_PORT || '3000'}`;

/**
 * Trading Server URL for tests
 * Reads from environment or defaults to localhost:3001
 */
export const TEST_TRADING_SERVER_URL =
  process.env.TRADING_SERVER_URL || `http://localhost:${process.env.TRADING_SERVER_PORT || '3001'}`;

/**
 * Dashboard URL for tests
 * Reads from environment or defaults to localhost:5000
 */
export const TEST_DASHBOARD_URL =
  process.env.DASHBOARD_URL || `http://localhost:${process.env.DASHBOARD_PORT || '5000'}`;

/**
 * Trading Client URL for tests
 * Reads from environment or defaults to localhost:5001
 */
export const TEST_TRADING_CLIENT_URL =
  process.env.TRADING_CLIENT_URL || `http://localhost:${process.env.TRADING_CLIENT_PORT || '5001'}`;
