/**
 * Trading API Functions
 * Thin wrappers around TradingApiClient for backward compatibility with existing hooks.
 * All types are re-exported from @platform/trading-domain for consistency.
 */
import { tradingClient } from './trading-client';
import type {
  Candlestick,
  BalanceResponse,
  MarginBalanceResponse,
  MaxBorrowable,
  SymbolPrice,
  KlinesResponse,
  WatchlistItemResponse,
  UserTradingSettingsResponse,
  SymbolSearchResult,
} from '@platform/trading-domain';

// Re-export types for backward compatibility with existing imports
export type {
  Candlestick,
  BalanceResponse,
  MarginBalanceResponse,
  MaxBorrowable,
  SymbolPrice,
  KlinesResponse,
  WatchlistItemResponse,
  UserTradingSettingsResponse,
  SymbolSearchResult,
};

/** Account mode for trading orders */
export type AccountMode = 'spot' | 'margin';

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

// ============================================
// User Settings Functions
// ============================================

/** Fetch user trading settings */
export async function fetchUserSettings(): Promise<UserTradingSettingsResponse> {
  return tradingClient.getUserSettings();
}

/** Update user trading settings */
export async function updateUserSettings(data: {
  defaultAccountMode?: AccountMode;
}): Promise<UserTradingSettingsResponse> {
  return tradingClient.updateUserSettings(data);
}
