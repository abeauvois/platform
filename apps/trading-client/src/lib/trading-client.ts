/**
 * Trading API Client Instance
 * Singleton client for trading operations in the browser
 */
import { TradingApiClient } from '@platform/trading-sdk';
import { config } from './config';

/**
 * Singleton trading API client instance.
 * Uses browser cookies for authentication (credentials: 'include').
 * No logger needed in browser - uses noop logger by default.
 */
export const tradingClient = new TradingApiClient({
  baseUrl: config.tradingApiUrl,
  // credentials defaults to 'include' for browser cookie auth
  // logger defaults to noop logger
});
