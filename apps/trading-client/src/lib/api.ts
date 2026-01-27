/**
 * Trading API Functions
 * Thin wrappers around TradingApiClient for backward compatibility with existing hooks.
 * All types are re-exported from @abeauvois/platform-trading-domain for consistency.
 */
import { tradingClient } from './trading-client';
import { settingsClient } from './platform-client';
import type {
  Candlestick,
  BalanceResponse,
  MarginBalanceResponse,
  MaxBorrowable,
  SymbolPrice,
  KlinesResponse,
  WatchlistItemResponse,
  SymbolSearchResult,
} from '@abeauvois/platform-trading-domain';
import type { UserSettings, UserSettingsUpdate, AccountMode } from '@abeauvois/platform-sdk';

// Re-export types for backward compatibility with existing imports
export type {
  Candlestick,
  BalanceResponse,
  MarginBalanceResponse,
  MaxBorrowable,
  SymbolPrice,
  KlinesResponse,
  WatchlistItemResponse,
  SymbolSearchResult,
  UserSettings,
  UserSettingsUpdate,
};

export type { AccountMode };

// ============================================
// Balance Functions
// ============================================

/** Fetch spot wallet balances */
export async function fetchSpotBalances(): Promise<BalanceResponse> {
  return tradingClient.getSpotBalances();
}

/** Fetch margin account balances */
export async function fetchMarginBalances(): Promise<MarginBalanceResponse> {
  return tradingClient.getMarginBalances();
}

/** Fetch maximum borrowable amount for an asset */
export async function fetchMaxBorrowable(asset: string): Promise<MaxBorrowable> {
  return tradingClient.getMaxBorrowable(asset);
}

// ============================================
// Market Data Functions
// ============================================

/** Fetch current prices for multiple symbols */
export async function fetchPrices(symbols: Array<string>): Promise<Array<SymbolPrice>> {
  return tradingClient.getPrices(symbols);
}

/** Fetch candlestick (klines) data for charting */
export async function fetchKlines(params: {
  symbol: string;
  interval: string;
  limit: number;
}): Promise<KlinesResponse> {
  return tradingClient.getKlines(params);
}

/** Fetch tradable symbols with prices for search */
export async function fetchSymbols(params?: {
  quoteAsset?: string;
  withPrices?: boolean;
}): Promise<Array<SymbolSearchResult>> {
  return tradingClient.getSymbols(params);
}

// ============================================
// Watchlist Functions
// ============================================

/** Fetch user watchlist with prices */
export async function fetchWatchlist(): Promise<Array<WatchlistItemResponse>> {
  return tradingClient.getWatchlist();
}

/** Add symbol to watchlist */
export async function addToWatchlist(symbol: string): Promise<void> {
  return tradingClient.addToWatchlist(symbol);
}

/** Remove symbol from watchlist */
export async function removeFromWatchlist(symbol: string): Promise<void> {
  return tradingClient.removeFromWatchlist(symbol);
}

/** Update reference timestamp for a watchlist symbol */
export async function updateWatchlistReference(symbol: string, timestamp: number | null): Promise<void> {
  return tradingClient.updateWatchlistReference(symbol, timestamp);
}

// ============================================
// User Settings Functions (via Platform API)
// ============================================

/** Fetch user settings from platform API */
export async function fetchUserSettings(): Promise<UserSettings> {
  return settingsClient.getUserSettings();
}

/** Update user settings via platform API */
export async function updateUserSettings(data: UserSettingsUpdate): Promise<UserSettings> {
  return settingsClient.updateUserSettings(data);
}
