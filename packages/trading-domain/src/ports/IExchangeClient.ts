/**
 * Exchange Client Port
 * Interface for fetching market data from cryptocurrency exchanges
 */

import type { MarketTicker, AccountBalance, Candlestick, Order, CreateOrderData } from '../types.js';

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

    /**
     * Get historical candlestick/kline data
     * @param symbol - Trading pair (e.g., 'BTCUSDT')
     * @param interval - Time interval ('1m', '5m', '15m', '1h', '4h', '1d', etc.)
     * @param limit - Number of candles to fetch (default 100, max depends on exchange)
     * @returns Array of candlestick data
     */
    getKlines(symbol: string, interval: string, limit?: number): Promise<Candlestick[]>;

    /**
     * Create a new order
     * @param data - Order details (symbol, side, type, quantity, price, etc.)
     * @returns Created order with ID and status
     */
    createOrder(data: CreateOrderData): Promise<Order>;

    /**
     * Get all orders for a symbol (or all symbols if not specified)
     * @param symbol - Trading pair (optional, if not provided returns all orders)
     * @returns Array of orders
     */
    getOrders(symbol?: string): Promise<Order[]>;

    /**
     * Cancel an existing order
     * @param orderId - Order ID to cancel
     * @param symbol - Trading pair symbol (required for some exchanges)
     * @returns void (throws error if cancellation fails)
     */
    cancelOrder(orderId: string, symbol: string): Promise<void>;
}
