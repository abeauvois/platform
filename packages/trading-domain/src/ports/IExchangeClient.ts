/**
 * Exchange Client Port
 * Interface for fetching market data from cryptocurrency exchanges
 */

import type { MarketTicker, AccountBalance, MarginBalance, Candlestick, Order, CreateOrderData, SymbolPrice, UserDataEventCallback, TradableSymbol } from '../types.js';

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
     * Get prices for multiple trading pairs in a single request
     * Uses lightweight endpoint that returns only symbol and price
     * @param symbols - Array of trading pair symbols (e.g., ['BTCUSDT', 'ETHUSDT'])
     * @returns Array of symbol prices
     */
    getTickers(symbols: string[]): Promise<SymbolPrice[]>;

    /**
     * Get all tradable symbols from the exchange
     * @param quoteAsset - Optional filter by quote asset (e.g., 'USDC')
     * @returns Array of tradable symbols
     */
    getSymbols(quoteAsset?: string): Promise<Array<TradableSymbol>>;

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
     * Get all margin account balances (requires authentication)
     * @returns Array of margin balances for all assets with non-zero balance
     */
    getMarginBalances(): Promise<MarginBalance[]>;

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

    /**
     * Get order history (filled orders) for a symbol
     * @param symbol - Trading pair symbol (required)
     * @param limit - Maximum number of orders to return (default: 50)
     * @returns Array of filled orders sorted by time descending
     */
    getOrderHistory(symbol: string, limit?: number): Promise<Order[]>;

    /**
     * Subscribe to user data stream events (order updates, balance changes)
     * @param callback - Function called when events are received
     * @returns Unsubscribe function to stop receiving events
     */
    subscribeToUserData(callback: UserDataEventCallback): Promise<() => void>;

    /**
     * Check if user data stream is supported by this client
     */
    supportsUserDataStream(): boolean;
}
