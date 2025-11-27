/**
 * Trading SDK Types
 * Request and response types for trading operations
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
 * Market data/ticker information
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
