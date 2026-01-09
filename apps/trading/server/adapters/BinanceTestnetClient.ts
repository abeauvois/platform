/**
 * Binance Testnet Client Adapter
 * Implements IExchangeClient interface for Binance Spot Testnet API
 * 
 * Infrastructure layer adapter for testing with Binance testnet
 * Base URL: https://testnet.binance.vision
 * 
 * Note: Testnet provides a safe environment for development without real funds
 */

import type {
    AccountBalance,
    Candlestick,
    CreateOrderData,
    IExchangeClient,
    MarginBalance,
    MarketTicker,
    Order,
    SymbolPrice,
    UserDataEventCallback
} from '@platform/trading-domain';

/**
 * Binance API response type for 24hr ticker
 */
interface BinanceTickerResponse {
    symbol: string;
    lastPrice: string;
    bidPrice: string;
    askPrice: string;
    volume: string;
    highPrice: string;
    lowPrice: string;
    priceChange: string;
    priceChangePercent: string;
}

/**
 * Binance API response type for price ticker (/ticker/price)
 */
interface BinancePriceResponse {
    symbol: string;
    price: string;
}

/**
 * Binance API response type for klines/candlesticks
 * Format: [openTime, open, high, low, close, volume, closeTime, ...]
 */
type BinanceKlineResponse = [
    number,  // Open time
    string,  // Open
    string,  // High
    string,  // Low
    string,  // Close
    string,  // Volume
    number,  // Close time
    string,  // Quote asset volume
    number,  // Number of trades
    string,  // Taker buy base asset volume
    string,  // Taker buy quote asset volume
    string   // Ignore
];

/**
 * Binance account response type
 */
interface BinanceAccountResponse {
    balances: Array<{
        asset: string;
        free: string;
        locked: string;
    }>;
}

/**
 * Binance order response type (for POST /order)
 */
interface BinanceOrderResponse {
    symbol: string;
    orderId: number;
    orderListId: number;
    clientOrderId: string;
    transactTime: number;
    price: string;
    origQty: string;
    executedQty: string;
    cummulativeQuoteQty: string;
    status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED';
    timeInForce: string;
    type: string;
    side: 'BUY' | 'SELL';
}

/**
 * Binance open/all order response type (for GET /openOrders or /allOrders)
 */
interface BinanceOpenOrderResponse {
    symbol: string;
    orderId: number;
    orderListId: number;
    clientOrderId: string;
    price: string;
    origQty: string;
    executedQty: string;
    cummulativeQuoteQty: string;
    status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED';
    timeInForce: string;
    type: string;
    side: 'BUY' | 'SELL';
    time: number;
    updateTime: number;
}

/**
 * Configuration options for BinanceTestnetClient
 */
export interface BinanceClientConfig {
    apiKey?: string;
    apiSecret?: string;
}

/**
 * Valid Binance kline intervals
 */
const VALID_INTERVALS = [
    '1s', '1m', '3m', '5m', '15m', '30m',
    '1h', '2h', '4h', '6h', '8h', '12h',
    '1d', '3d', '1w', '1M'
];

/**
 * Binance Testnet Client
 * Uses Binance Spot Testnet for safe development/testing
 */
export class BinanceTestnetClient implements IExchangeClient {
    private readonly baseUrl = 'https://testnet.binance.vision/api/v3';
    private readonly apiKey?: string;
    private readonly apiSecret?: string;

    constructor(config?: BinanceClientConfig) {
        this.apiKey = config?.apiKey;
        this.apiSecret = config?.apiSecret;
    }

    /**
     * Get the exchange name
     */
    getExchangeName(): string {
        return 'Binance Testnet';
    }

    /**
     * Check if the client is authenticated
     */
    isAuthenticated(): boolean {
        return !!(this.apiKey && this.apiSecret);
    }

    /**
     * Get ticker data for a trading pair (public endpoint)
     * @param symbol - Trading pair symbol (e.g., 'BTCUSDT', 'BTC/USD')
     * @returns Market ticker data
     */
    async getTicker(symbol: string): Promise<MarketTicker> {
        const binanceSymbol = this.convertSymbol(symbol);
        const url = `${this.baseUrl}/ticker/24hr?symbol=${binanceSymbol}`;

        const response = await fetch(url, {
            method: 'GET',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Binance Testnet API error: ${response.status} - ${errorData.msg || response.statusText}`);
        }

        const data: BinanceTickerResponse = await response.json();

        return this.mapToMarketTicker(data);
    }

    /**
     * Get prices for multiple trading pairs in a single request (public endpoint)
     * Uses lightweight /ticker/price endpoint
     * @param symbols - Array of trading pair symbols (e.g., ['BTCUSDT', 'BTC/USD'])
     * @returns Array of symbol prices
     */
    async getTickers(symbols: Array<string>): Promise<Array<SymbolPrice>> {
        if (symbols.length === 0) {
            return [];
        }

        const binanceSymbols = symbols.map(s => this.convertSymbol(s));
        const symbolsParam = JSON.stringify(binanceSymbols);
        const url = `${this.baseUrl}/ticker/price?symbols=${encodeURIComponent(symbolsParam)}`;

        const response = await fetch(url, {
            method: 'GET',
        });

        if (!response.ok) {
            // If batch request fails (e.g., invalid symbol), fall back to individual requests
            const results: Array<SymbolPrice> = [];
            for (const symbol of binanceSymbols) {
                try {
                    const singleUrl = `${this.baseUrl}/ticker/price?symbol=${symbol}`;
                    const singleResponse = await fetch(singleUrl, { method: 'GET' });
                    if (singleResponse.ok) {
                        const data: BinancePriceResponse = await singleResponse.json();
                        results.push({
                            symbol: data.symbol,
                            price: Number.parseFloat(data.price),
                        });
                    }
                    // Skip invalid symbols silently
                } catch {
                    // Skip symbols that fail
                }
            }
            return results;
        }

        const data: Array<BinancePriceResponse> = await response.json();

        return data.map(d => ({
            symbol: d.symbol,
            price: Number.parseFloat(d.price),
        }));
    }

    /**
     * Get historical candlestick/kline data (public endpoint)
     * @param symbol - Trading pair (e.g., 'BTCUSDT')
     * @param interval - Time interval ('1m', '5m', '1h', '1d', etc.)
     * @param limit - Number of candles to fetch (default 100, max 1000)
     * @returns Array of candlestick data
     */
    async getKlines(symbol: string, interval: string, limit: number = 100): Promise<Array<Candlestick>> {
        // Validate interval
        if (!VALID_INTERVALS.includes(interval)) {
            throw new Error(`Invalid interval: ${interval}. Must be one of: ${VALID_INTERVALS.join(', ')}`);
        }

        // Validate limit
        if (limit <= 0) {
            throw new Error('Limit must be greater than 0');
        }

        if (limit > 1000) {
            throw new Error('Limit cannot exceed 1000');
        }

        const binanceSymbol = this.convertSymbol(symbol);
        const url = `${this.baseUrl}/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;

        const response = await fetch(url, {
            method: 'GET',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Binance Testnet API error: ${response.status} - ${errorData.msg || response.statusText}`);
        }

        const data: Array<BinanceKlineResponse> = await response.json();

        return data.map((kline) => this.mapToCandlestick(kline));
    }

    /**
     * Get all account balances (requires authentication)
     * @returns Array of account balances for all assets
     */
    async getBalances(): Promise<Array<AccountBalance>> {
        if (!this.isAuthenticated()) {
            throw new Error('Authentication required: API key and secret must be provided');
        }

        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;
        const signature = await this.sign(queryString);
        const url = `${this.baseUrl}/account?${queryString}&signature=${signature}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-MBX-APIKEY': this.apiKey!,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Binance Testnet API error: ${response.status} - ${errorData.msg || response.statusText}`);
        }

        const data: BinanceAccountResponse = await response.json();

        return data.balances.map(this.mapToAccountBalance);
    }

    /**
     * Get balance for a specific asset (requires authentication)
     * @param asset - Asset symbol (e.g., 'BTC', 'USDT')
     * @returns Account balance for the specified asset, or null if not found
     */
    async getBalance(asset: string): Promise<AccountBalance | null> {
        const balances = await this.getBalances();
        const upperAsset = asset.toUpperCase();
        return balances.find(b => b.asset === upperAsset) || null;
    }

    /**
     * Get all margin account balances (requires authentication)
     * Note: Binance Testnet does not support margin trading
     * @returns Array of margin balances
     */
    async getMarginBalances(): Promise<Array<MarginBalance>> {
        throw new Error('Margin trading is not supported on Binance Testnet');
    }

    /**
     * Create a new order (requires authentication)
     * @param data - Order details
     * @returns Created order with ID and status
     */
    async createOrder(data: CreateOrderData): Promise<Order> {
        if (!this.isAuthenticated()) {
            throw new Error('Authentication required: API key and secret must be provided');
        }

        const timestamp = Date.now();
        const binanceSymbol = this.convertSymbol(data.symbol);

        // Build order parameters
        const params = new URLSearchParams({
            symbol: binanceSymbol,
            side: data.side.toUpperCase(),
            type: data.type.toUpperCase(),
            quantity: data.quantity.toString(),
            timestamp: timestamp.toString(),
        });

        // Add price for limit orders
        if (data.type === 'limit' && data.price !== undefined) {
            params.append('price', data.price.toString());
            params.append('timeInForce', data.timeInForce || 'GTC');
        }

        // Add stop price for stop orders
        if ((data.type === 'stop' || data.type === 'stop_limit') && data.stopPrice !== undefined) {
            params.append('stopPrice', data.stopPrice.toString());
        }

        const queryString = params.toString();
        const signature = await this.sign(queryString);
        const url = `${this.baseUrl}/order?${queryString}&signature=${signature}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-MBX-APIKEY': this.apiKey!,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Binance Testnet API error: ${response.status} - ${errorData.msg || response.statusText}`);
        }

        const orderResponse: BinanceOrderResponse = await response.json();
        return this.mapBinanceOrderToOrder(orderResponse);
    }

    /**
     * Map Binance order response to Order domain model
     */
    private mapBinanceOrderToOrder(data: BinanceOrderResponse): Order {
        const statusMap: Record<BinanceOrderResponse['status'], Order['status']> = {
            'NEW': 'pending',
            'PARTIALLY_FILLED': 'partially_filled',
            'FILLED': 'filled',
            'CANCELED': 'cancelled',
            'REJECTED': 'rejected',
            'EXPIRED': 'cancelled',
        };

        const typeMap: Record<string, Order['type']> = {
            'MARKET': 'market',
            'LIMIT': 'limit',
            'STOP_LOSS': 'stop',
            'STOP_LOSS_LIMIT': 'stop_limit',
            'TAKE_PROFIT': 'stop',
            'TAKE_PROFIT_LIMIT': 'stop_limit',
        };

        const now = new Date(data.transactTime);
        const price = Number.parseFloat(data.price);

        return {
            id: data.orderId.toString(),
            symbol: data.symbol,
            side: data.side.toLowerCase() as 'buy' | 'sell',
            type: typeMap[data.type] ?? 'limit',
            quantity: Number.parseFloat(data.origQty),
            price: price > 0 ? price : undefined,
            status: statusMap[data.status],
            filledQuantity: Number.parseFloat(data.executedQty),
            createdAt: now,
            updatedAt: now,
        };
    }

    /**
     * Get all orders for a symbol (requires authentication)
     * @param symbol - Trading pair (optional)
     * @returns Array of orders
     */
    async getOrders(symbol?: string): Promise<Array<Order>> {
        if (!this.isAuthenticated()) {
            throw new Error('Authentication required: API key and secret must be provided');
        }

        // TODO: Implement in next phase
        throw new Error('getOrders not yet implemented');
    }

    /**
     * Cancel an order (requires authentication)
     * @param orderId - Order ID to cancel
     * @param symbol - Trading pair symbol
     * @returns void
     */
    async cancelOrder(orderId: string, symbol: string): Promise<void> {
        if (!this.isAuthenticated()) {
            throw new Error('Authentication required: API key and secret must be provided');
        }

        // TODO: Implement in next phase
        throw new Error('cancelOrder not yet implemented');
    }

    /**
     * Get order history (filled orders) for a symbol
     * @param symbol - Trading pair symbol (required)
     * @param limit - Maximum number of orders to return (default: 50)
     * @returns Array of filled orders sorted by time descending
     */
    async getOrderHistory(symbol: string, limit: number = 50): Promise<Array<Order>> {
        if (!this.isAuthenticated()) {
            throw new Error('Authentication required: API key and secret must be provided');
        }

        const timestamp = Date.now();
        const binanceSymbol = this.convertSymbol(symbol);
        const params = new URLSearchParams({
            symbol: binanceSymbol,
            limit: limit.toString(),
            timestamp: timestamp.toString(),
        });

        const queryString = params.toString();
        const signature = await this.sign(queryString);
        const url = `${this.baseUrl}/allOrders?${queryString}&signature=${signature}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-MBX-APIKEY': this.apiKey!,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Binance Testnet API error: ${response.status} - ${errorData.msg || response.statusText}`);
        }

        const data: Array<BinanceOpenOrderResponse> = await response.json();

        // Filter to only filled orders and sort by time descending
        return data
            .filter((order) => order.status === 'FILLED')
            .map((order) => this.mapBinanceOpenOrderToOrder(order))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /**
     * Map Binance open order response to Order domain model
     */
    private mapBinanceOpenOrderToOrder(data: BinanceOpenOrderResponse): Order {
        const statusMap: Record<BinanceOpenOrderResponse['status'], Order['status']> = {
            'NEW': 'pending',
            'PARTIALLY_FILLED': 'partially_filled',
            'FILLED': 'filled',
            'CANCELED': 'cancelled',
            'REJECTED': 'rejected',
            'EXPIRED': 'cancelled',
        };

        const typeMap: Record<string, Order['type']> = {
            'MARKET': 'market',
            'LIMIT': 'limit',
            'STOP_LOSS': 'stop_loss',
            'STOP_LOSS_LIMIT': 'stop_loss_limit',
            'TAKE_PROFIT': 'take_profit',
            'TAKE_PROFIT_LIMIT': 'take_profit_limit',
        };

        const price = Number.parseFloat(data.price);

        return {
            id: data.orderId.toString(),
            symbol: data.symbol,
            side: data.side.toLowerCase() as 'buy' | 'sell',
            type: typeMap[data.type] ?? 'limit',
            quantity: Number.parseFloat(data.origQty),
            price: price > 0 ? price : undefined,
            status: statusMap[data.status],
            filledQuantity: Number.parseFloat(data.executedQty),
            createdAt: new Date(data.time),
            updatedAt: new Date(data.updateTime),
        };
    }

    /**
     * Check if user data stream is supported
     * Note: Not implemented for testnet
     */
    supportsUserDataStream(): boolean {
        return false;
    }

    /**
     * Subscribe to user data stream events
     * Note: Not implemented for testnet
     */
    async subscribeToUserData(_callback: UserDataEventCallback): Promise<() => void> {
        throw new Error('User data stream is not supported on Binance Testnet client');
    }

    /**
     * Convert common symbol formats to Binance format
     * Examples:
     *   - 'BTC/USD' -> 'BTCUSDT'
     *   - 'ETH/USD' -> 'ETHUSDT'
     *   - 'BTCUSDT' -> 'BTCUSDT' (pass through)
     */
    private convertSymbol(symbol: string): string {
        // If already in Binance format (no slash), return as-is
        if (!symbol.includes('/')) {
            return symbol;
        }

        // Convert 'BASE/QUOTE' format to Binance format
        const [base, quote] = symbol.split('/');

        // Map USD to USDT (Binance uses USDT for USD pairs)
        const binanceQuote = quote === 'USD' ? 'USDT' : quote;

        return `${base}${binanceQuote}`;
    }

    /**
     * Map Binance API response to MarketTicker domain model
     */
    private mapToMarketTicker(data: BinanceTickerResponse): MarketTicker {
        return {
            symbol: data.symbol,
            lastPrice: parseFloat(data.lastPrice),
            bidPrice: parseFloat(data.bidPrice),
            askPrice: parseFloat(data.askPrice),
            volume24h: parseFloat(data.volume),
            high24h: parseFloat(data.highPrice),
            low24h: parseFloat(data.lowPrice),
            priceChange24h: parseFloat(data.priceChange),
            priceChangePercent24h: parseFloat(data.priceChangePercent),
            timestamp: new Date(),
        };
    }

    /**
     * Map Binance kline response to Candlestick domain model
     */
    private mapToCandlestick(data: BinanceKlineResponse): Candlestick {
        return {
            openTime: data[0],
            open: parseFloat(data[1]),
            high: parseFloat(data[2]),
            low: parseFloat(data[3]),
            close: parseFloat(data[4]),
            volume: parseFloat(data[5]),
            closeTime: data[6],
        };
    }

    /**
     * Map Binance balance to AccountBalance domain model
     */
    private mapToAccountBalance(data: { asset: string; free: string; locked: string }): AccountBalance {
        const free = parseFloat(data.free);
        const locked = parseFloat(data.locked);
        return {
            asset: data.asset,
            free,
            locked,
            total: free + locked,
        };
    }

    /**
     * Generate HMAC SHA256 signature for authenticated requests
     */
    private async sign(queryString: string): Promise<string> {
        const encoder = new TextEncoder();
        const key = encoder.encode(this.apiSecret);
        const message = encoder.encode(queryString);

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            key,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
        const hashArray = Array.from(new Uint8Array(signature));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}
