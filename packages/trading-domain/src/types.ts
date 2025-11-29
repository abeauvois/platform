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
 * Order data
 */
export interface Order {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop' | 'stop_limit';
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
    type: 'market' | 'limit' | 'stop' | 'stop_limit';
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
 * Account balance information
 */
export interface AccountBalance {
    asset: string;
    free: number;
    locked: number;
    total: number;
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
