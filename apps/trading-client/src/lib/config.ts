/**
 * Runtime configuration for API endpoints
 * In development, Vite proxy handles routing - use relative paths
 * In production, use absolute URLs from environment variables
 */
export const config = {
  /** Trading server API base URL (empty string for relative paths in dev) */
  tradingApiUrl: import.meta.env.VITE_TRADING_API_URL || '',
  /** Auth API base URL for better-auth (empty string for relative paths in dev) */
  authApiUrl: import.meta.env.VITE_AUTH_API_URL || '',
};
