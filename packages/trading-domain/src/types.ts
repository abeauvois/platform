/**
 * Trading Domain Types
 * Core domain types for trading operations
 */

/**
 * Trading position data
 */
export interface Position {
    id: string;
    symbol: string;
    side: 'long' | 'short';
    quantity: number;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
    realizedPnL: number;
    openedAt: Date;
}

/**
 * Order type - includes Binance stop order variants
 */
export type OrderType =
    | 'market'
    | 'limit'
    | 'stop_loss'           // Market order triggered at stop price (against position)
    | 'stop_loss_limit'     // Limit order triggered at stop price (against position)
    | 'take_profit'         // Market order triggered at stop price (with position)
    | 'take_profit_limit';  // Limit order triggered at stop price (with position)

/**
 * Order data
 */
export interface Order {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    type: OrderType;
    quantity: number;
    price?: number;
    stopPrice?: number;
    status: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected';
    filledQuantity: number;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Create order request data
 */
export interface CreateOrderData {
    symbol: string;
    side: 'buy' | 'sell';
    type: OrderType;
    quantity: number;
    price?: number;
    stopPrice?: number;
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

/**
 * Market data/ticker information (raw API response)
 * Timestamps come as strings from JSON and need conversion to Date
 */
export interface MarketTickerResponse {
    symbol: string;
    lastPrice: number;
    bidPrice: number;
    askPrice: number;
    volume24h: number;
    high24h: number;
    low24h: number;
    priceChange24h: number;
    priceChangePercent24h: number;
    timestamp: string;
}

/**
 * Market data/ticker information (domain model)
 */
export interface MarketTicker {
    symbol: string;
    lastPrice: number;
    bidPrice: number;
    askPrice: number;
    volume24h: number;
    high24h: number;
    low24h: number;
    priceChange24h: number;
    priceChangePercent24h: number;
    timestamp: Date;
}

/**
 * Symbol price with optional 24h change data (from /ticker/24hr endpoint)
 * Used for batch price lookups with daily variation
 */
export interface SymbolPrice {
    symbol: string;
    price: number;
    priceChangePercent24h?: number;
}

/**
 * Account balance information
 */
export interface AccountBalance {
    asset: string;
    free: number;
    locked: number;
    total: number;
}

/**
 * Margin account balance information
 * Includes borrowed amount and interest for margin trading
 */
export interface MarginBalance {
    asset: string;
    free: number;
    locked: number;
    borrowed: number;
    interest: number;
    netAsset: number;  // free + locked - borrowed - interest
}

/**
 * Portfolio summary
 */
export interface Portfolio {
    totalEquity: number;
    totalPnL: number;
    totalPnLPercent: number;
    balances: AccountBalance[];
    positions: Position[];
}

/**
 * Trade history item
 */
export interface Trade {
    id: string;
    orderId: string;
    symbol: string;
    side: 'buy' | 'sell';
    price: number;
    quantity: number;
    commission: number;
    commissionAsset: string;
    timestamp: Date;
}

/**
 * Candlestick/Kline data for charting
 */
export interface Candlestick {
    openTime: number;      // Unix timestamp in milliseconds
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    closeTime: number;     // Unix timestamp in milliseconds
}

/**
 * Maximum order value in USD without additional confirmation
 */
export const MAX_ORDER_VALUE_USD = 500;

/**
 * Validation result for order operations
 */
export interface OrderValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validate order value against the maximum limit
 * @param quantity - Order quantity
 * @param price - Price per unit
 * @returns Validation result with error message if invalid
 */
export function validateOrderValue(
    quantity: number,
    price: number
): OrderValidationResult {
    if (quantity <= 0) {
        return {
            valid: false,
            error: 'Quantity must be greater than 0'
        };
    }

    if (price <= 0) {
        return {
            valid: false,
            error: 'Price must be greater than 0'
        };
    }

    const totalValue = quantity * price;
    if (totalValue > MAX_ORDER_VALUE_USD) {
        return {
            valid: false,
            error: `Order value $${totalValue.toFixed(2)} exceeds limit of $${MAX_ORDER_VALUE_USD}`
        };
    }

    return { valid: true };
}

/**
 * Order update event from user data stream
 * Sent when an order is created, updated, partially filled, or fully filled
 */
export interface OrderUpdateEvent {
    eventType: 'ORDER_UPDATE';
    eventTime: number;
    order: Order;
}

/**
 * Balance update event from user data stream
 * Sent when account balance changes (deposits, withdrawals, trades)
 */
export interface BalanceUpdateEvent {
    eventType: 'BALANCE_UPDATE';
    eventTime: number;
    asset: string;
    balanceDelta: number;
}

/**
 * Union type for all user data stream events
 */
export type UserDataEvent = OrderUpdateEvent | BalanceUpdateEvent;

/**
 * Callback type for user data stream events
 */
export type UserDataEventCallback = (event: UserDataEvent) => void;

/**
 * EMA (Exponential Moving Average) data point for chart rendering
 */
export interface EMADataPoint {
    time: number;  // Unix seconds (generic, client casts to chart-specific Time type)
    value: number;
}

/**
 * API response envelope for spot balance data
 */
export interface BalanceResponse {
    exchange: string;
    balances: AccountBalance[];
    count: number;
}

/**
 * API response envelope for margin balance data
 */
export interface MarginBalanceResponse {
    exchange: string;
    balances: MarginBalance[];
    count: number;
}

/**
 * Tradable symbol information for search/listing
 */
export interface TradableSymbol {
    symbol: string;       // Full trading pair (e.g., 'BTCUSDC')
    baseAsset: string;    // Base asset (e.g., 'BTC')
    quoteAsset: string;   // Quote asset (e.g., 'USDC')
    status: 'TRADING' | 'HALT' | 'BREAK';
}

/**
 * Symbol with market data for search results display
 */
export interface SymbolSearchResult {
    symbol: string;
    baseAsset: string;
    price: number;
    priceChangePercent24h: number;
}
