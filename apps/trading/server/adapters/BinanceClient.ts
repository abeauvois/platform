/**
 * Binance Exchange Client Adapter
 * Implements IExchangeClient interface for Binance API
 * 
 * Infrastructure layer adapter for fetching market data from Binance
 * Supports both public (unauthenticated) and private (authenticated) endpoints
 */

import type { AccountBalance, Candlestick, CreateOrderData, IExchangeClient, MarginBalance, MarketTicker, Order, SymbolPrice, UserDataEventCallback, UserDataEvent } from '@platform/trading-domain';
import WebSocket from 'ws';

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
 * Valid Binance kline intervals
 */
const VALID_INTERVALS = [
    '1s', '1m', '3m', '5m', '15m', '30m',
    '1h', '2h', '4h', '6h', '8h', '12h',
    '1d', '3d', '1w', '1M'
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
 * Binance margin account response type
 */
interface BinanceMarginAccountResponse {
    userAssets: Array<{
        asset: string;
        free: string;
        locked: string;
        borrowed: string;
        interest: string;
        netAsset: string;
    }>;
}

/**
 * Binance order response type
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
 * Binance user data stream execution report (order update)
 */
interface BinanceExecutionReport {
    e: 'executionReport';  // Event type
    E: number;             // Event time
    s: string;             // Symbol
    c: string;             // Client order ID
    S: 'BUY' | 'SELL';     // Side
    o: string;             // Order type
    f: string;             // Time in force
    q: string;             // Order quantity
    p: string;             // Order price
    P: string;             // Stop price
    F: string;             // Iceberg quantity
    g: number;             // OrderListId
    C: string;             // Original client order ID
    x: string;             // Current execution type
    X: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED'; // Current order status
    r: string;             // Order reject reason
    i: number;             // Order ID
    l: string;             // Last executed quantity
    z: string;             // Cumulative filled quantity
    L: string;             // Last executed price
    n: string;             // Commission amount
    N: string | null;      // Commission asset
    T: number;             // Transaction time
    t: number;             // Trade ID
    I: number;             // Ignore
    w: boolean;            // Is the order on the book?
    m: boolean;            // Is this trade the maker side?
    M: boolean;            // Ignore
    O: number;             // Order creation time
    Z: string;             // Cumulative quote asset transacted quantity
    Y: string;             // Last quote asset transacted quantity
    Q: string;             // Quote order quantity
}

/**
 * Binance balance update from user data stream
 */
interface BinanceBalanceUpdate {
    e: 'balanceUpdate';    // Event type
    E: number;             // Event time
    a: string;             // Asset
    d: string;             // Balance delta
    T: number;             // Clear time
}

/**
 * Configuration options for BinanceClient
 */
export interface BinanceClientConfig {
    apiKey?: string;
    apiSecret?: string;
}

/**
 * Binance Exchange Client
 * Fetches real-time market data from Binance public API
 * Supports authenticated requests for account data (balances, orders, etc.)
 */
export class BinanceClient implements IExchangeClient {
    private readonly baseUrl = 'https://api.binance.com/api/v3';
    private readonly sapiUrl = 'https://api.binance.com/sapi/v1';
    private readonly wsBaseUrl = 'wss://stream.binance.com:9443/ws';
    private readonly apiKey?: string;
    private readonly apiSecret?: string;

    // User data stream state
    private listenKey: string | null = null;
    private userDataWs: WebSocket | null = null;
    private listenKeyRefreshInterval: ReturnType<typeof setInterval> | null = null;
    private userDataCallbacks: Set<UserDataEventCallback> = new Set();

    constructor(config?: BinanceClientConfig) {
        this.apiKey = config?.apiKey;
        this.apiSecret = config?.apiSecret;
    }

    /**
     * Get the exchange name
     */
    getExchangeName(): string {
        return 'Binance';
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
            throw new Error(`Binance API error: ${response.status} - ${errorData.msg || response.statusText}`);
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
            throw new Error(`Binance API error: ${response.status} - ${errorData.msg || response.statusText}`);
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
     * @returns Array of margin balances for all assets
     */
    async getMarginBalances(): Promise<Array<MarginBalance>> {
        if (!this.isAuthenticated()) {
            throw new Error('Authentication required: API key and secret must be provided');
        }

        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;
        const signature = await this.sign(queryString);
        const url = `${this.sapiUrl}/margin/account?${queryString}&signature=${signature}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-MBX-APIKEY': this.apiKey!,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Binance API error: ${response.status} - ${errorData.msg || response.statusText}`);
        }

        const data: BinanceMarginAccountResponse = await response.json();

        return data.userAssets.map(this.mapToMarginBalance);
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
            throw new Error(`Binance API error: ${response.status} - ${errorData.msg || response.statusText}`);
        }

        const data: Array<BinanceKlineResponse> = await response.json();

        return data.map((kline) => this.mapToCandlestick(kline));
    }

    /**
     * Map Binance kline response to Candlestick domain model
     */
    private mapToCandlestick(data: BinanceKlineResponse): Candlestick {
        return {
            openTime: data[0],
            open: Number.parseFloat(data[1]),
            high: Number.parseFloat(data[2]),
            low: Number.parseFloat(data[3]),
            close: Number.parseFloat(data[4]),
            volume: Number.parseFloat(data[5]),
            closeTime: data[6],
        };
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
            throw new Error(`Binance API error: ${response.status} - ${errorData.msg || response.statusText}`);
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
        // TODO: Implement order fetching for production Binance
        throw new Error('getOrders not yet implemented for production Binance');
    }

    /**
     * Cancel an order (requires authentication)
     * @param orderId - Order ID to cancel
     * @param symbol - Trading pair symbol
     * @returns void
     */
    async cancelOrder(orderId: string, symbol: string): Promise<void> {
        // TODO: Implement order cancellation for production Binance
        throw new Error('cancelOrder not yet implemented for production Binance');
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
     * Map Binance margin balance to MarginBalance domain model
     */
    private mapToMarginBalance(data: { asset: string; free: string; locked: string; borrowed: string; interest: string; netAsset: string }): MarginBalance {
        return {
            asset: data.asset,
            free: Number.parseFloat(data.free),
            locked: Number.parseFloat(data.locked),
            borrowed: Number.parseFloat(data.borrowed),
            interest: Number.parseFloat(data.interest),
            netAsset: Number.parseFloat(data.netAsset),
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

    /**
     * Check if user data stream is supported
     */
    supportsUserDataStream(): boolean {
        return this.isAuthenticated();
    }

    /**
     * Subscribe to user data stream events
     * @param callback - Function called when events are received
     * @returns Unsubscribe function
     */
    async subscribeToUserData(callback: UserDataEventCallback): Promise<() => void> {
        if (!this.isAuthenticated()) {
            throw new Error('Authentication required for user data stream');
        }

        this.userDataCallbacks.add(callback);

        // Start WebSocket connection if not already connected
        if (!this.userDataWs) {
            await this.startUserDataStream();
        }

        // Return unsubscribe function
        return () => {
            this.userDataCallbacks.delete(callback);
            // Close WebSocket if no more subscribers
            if (this.userDataCallbacks.size === 0) {
                this.stopUserDataStream();
            }
        };
    }

    /**
     * Start the user data stream WebSocket connection
     */
    private async startUserDataStream(): Promise<void> {
        // Get listen key from Binance
        this.listenKey = await this.createListenKey();

        // Connect to WebSocket
        const wsUrl = `${this.wsBaseUrl}/${this.listenKey}`;
        this.userDataWs = new WebSocket(wsUrl);

        this.userDataWs.on('open', () => {
            console.log('[BinanceClient] User data stream connected');
        });

        this.userDataWs.on('message', (data: Buffer) => {
            try {
                const message = JSON.parse(data.toString());
                const event = this.mapBinanceEventToUserDataEvent(message);
                if (event) {
                    for (const callback of this.userDataCallbacks) {
                        callback(event);
                    }
                }
            } catch (error) {
                console.error('[BinanceClient] Failed to parse WebSocket message:', error);
            }
        });

        this.userDataWs.on('error', (error) => {
            console.error('[BinanceClient] WebSocket error:', error);
        });

        this.userDataWs.on('close', () => {
            console.log('[BinanceClient] User data stream disconnected');
            this.userDataWs = null;
            // Attempt to reconnect if there are still subscribers
            if (this.userDataCallbacks.size > 0) {
                setTimeout(() => this.startUserDataStream(), 5000);
            }
        });

        // Refresh listen key every 30 minutes (expires after 60 minutes)
        this.listenKeyRefreshInterval = setInterval(async () => {
            try {
                await this.refreshListenKey();
            } catch (error) {
                console.error('[BinanceClient] Failed to refresh listen key:', error);
            }
        }, 30 * 60 * 1000);
    }

    /**
     * Stop the user data stream
     */
    private stopUserDataStream(): void {
        if (this.listenKeyRefreshInterval) {
            clearInterval(this.listenKeyRefreshInterval);
            this.listenKeyRefreshInterval = null;
        }

        if (this.userDataWs) {
            this.userDataWs.close();
            this.userDataWs = null;
        }

        if (this.listenKey) {
            this.deleteListenKey().catch(console.error);
            this.listenKey = null;
        }
    }

    /**
     * Create a listen key for user data stream
     */
    private async createListenKey(): Promise<string> {
        const url = `${this.baseUrl}/userDataStream`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-MBX-APIKEY': this.apiKey!,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to create listen key: ${errorData.msg || response.statusText}`);
        }

        const data = await response.json();
        return data.listenKey;
    }

    /**
     * Refresh the listen key to keep it alive
     */
    private async refreshListenKey(): Promise<void> {
        if (!this.listenKey) return;

        const url = `${this.baseUrl}/userDataStream?listenKey=${this.listenKey}`;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'X-MBX-APIKEY': this.apiKey!,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to refresh listen key: ${errorData.msg || response.statusText}`);
        }

        console.log('[BinanceClient] Listen key refreshed');
    }

    /**
     * Delete the listen key when done
     */
    private async deleteListenKey(): Promise<void> {
        if (!this.listenKey) return;

        const url = `${this.baseUrl}/userDataStream?listenKey=${this.listenKey}`;

        await fetch(url, {
            method: 'DELETE',
            headers: {
                'X-MBX-APIKEY': this.apiKey!,
            },
        });
    }

    /**
     * Map Binance WebSocket event to domain UserDataEvent
     */
    private mapBinanceEventToUserDataEvent(message: BinanceExecutionReport | BinanceBalanceUpdate): UserDataEvent | null {
        if (message.e === 'executionReport') {
            const report = message;
            const statusMap: Record<BinanceExecutionReport['X'], Order['status']> = {
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

            const price = Number.parseFloat(report.p);

            return {
                eventType: 'ORDER_UPDATE',
                eventTime: report.E,
                order: {
                    id: report.i.toString(),
                    symbol: report.s,
                    side: report.S.toLowerCase() as 'buy' | 'sell',
                    type: typeMap[report.o] ?? 'limit',
                    quantity: Number.parseFloat(report.q),
                    price: price > 0 ? price : undefined,
                    status: statusMap[report.X],
                    filledQuantity: Number.parseFloat(report.z),
                    createdAt: new Date(report.O),
                    updatedAt: new Date(report.T),
                },
            };
        }

        if (message.e === 'balanceUpdate') {
            const update = message;
            return {
                eventType: 'BALANCE_UPDATE',
                eventTime: update.E,
                asset: update.a,
                balanceDelta: Number.parseFloat(update.d),
            };
        }

        return null;
    }
}
