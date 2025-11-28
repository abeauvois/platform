/**
 * Exchange Client Port
 * Interface for fetching market data from cryptocurrency exchanges
 */

import type { MarketTicker, AccountBalance } from '../types.js';

/**
 * Exchange client interface for fetching market data
 */
export interface IExchangeClient {
    /**
     * Get ticker data for a trading pair
     * @param symbol - Trading pair symbol (e.g., 'BTCUSDT', 'BTC/USD')
     * @returns Market ticker data
     */
    getTicker(symbol: string): Promise<MarketTicker>;

    /**
     * Get the exchange name
     */
    getExchangeName(): string;

    /**
     * Get account balances (requires authentication)
     * @returns Array of account balances for all assets
     */
    getBalances(): Promise<AccountBalance[]>;

    /**
     * Get balance for a specific asset (requires authentication)
     * @param asset - Asset symbol (e.g., 'BTC', 'USDT')
     * @returns Account balance for the specified asset
     */
    getBalance(asset: string): Promise<AccountBalance | null>;

    /**
     * Check if the client is authenticated
     */
    isAuthenticated(): boolean;
}
