/**
 * Trading API Client Instance
 * Singleton client for trading operations in the browser
 */
import { TradingApiClient } from '@abeauvois/platform-trading-sdk';
import { config } from './config';
import { getAuthToken } from './auth-token';

/**
 * Singleton trading API client instance.
 * Uses bearer token for cross-service authentication with platform auth.
 * The token is obtained from platform API after sign-in.
 */
export const tradingClient = new TradingApiClient({
  baseUrl: config.tradingApiUrl,
  // Use bearer token for cross-service auth (platform auth -> trading-server)
  getToken: getAuthToken,
});
