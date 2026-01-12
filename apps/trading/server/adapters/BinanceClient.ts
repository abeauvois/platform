/**
 * Binance Exchange Client Adapter
 * Implements IExchangeClient interface for Binance API
 * 
 * Infrastructure layer adapter for fetching market data from Binance
 * Supports both public (unauthenticated) and private (authenticated) endpoints
 */

import WebSocket from 'ws';
import type { AccountBalance, Candlestick, CreateOrderData, IExchangeClient, MarginBalance, MarketTicker, Order, SymbolPrice, TradableSymbol, UserDataEventCallback, UserDataEvent } from '@platform/trading-domain';

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
 * Binance open order response type (for GET /openOrders)
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
 * Binance LOT_SIZE filter - defines quantity precision
 */
interface BinanceLotSizeFilter {
    filterType: 'LOT_SIZE';
    minQty: string;
    maxQty: string;
    stepSize: string;
}

/**
 * Binance PRICE_FILTER - defines price precision
 */
interface BinancePriceFilter {
    filterType: 'PRICE_FILTER';
    minPrice: string;
    maxPrice: string;
    tickSize: string;
}

/**
 * Binance symbol info from exchange info endpoint
 */
interface BinanceSymbolInfo {
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    filters: Array<BinanceLotSizeFilter | BinancePriceFilter | { filterType: string }>;
}

/**
 * Binance exchange info response
 */
interface BinanceExchangeInfoResponse {
    symbols: Array<BinanceSymbolInfo>;
}

/**
 * Cached symbol filter info for quantity/price precision
 */
interface SymbolFilterInfo {
    stepSize: number;
    tickSize: number;
    minQty: number;
    maxQty: number;
    minPrice: number;
    maxPrice: number;
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

    // Symbol filter cache (for quantity/price precision)
    private symbolFilterCache: Map<string, SymbolFilterInfo> = new Map();

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
     * Uses /ticker/24hr endpoint to include 24h price change data
     * @param symbols - Array of trading pair symbols (e.g., ['BTCUSDT', 'BTC/USD'])
     * @returns Array of symbol prices with 24h change percent
     */
    async getTickers(symbols: Array<string>): Promise<Array<SymbolPrice>> {
        if (symbols.length === 0) {
            return [];
        }

        const binanceSymbols = symbols.map(s => this.convertSymbol(s));
        const symbolsParam = JSON.stringify(binanceSymbols);
        const url = `${this.baseUrl}/ticker/24hr?symbols=${encodeURIComponent(symbolsParam)}`;

        const response = await fetch(url, {
            method: 'GET',
        });

        if (!response.ok) {
            // If batch request fails (e.g., invalid symbol), fall back to individual requests
            const results: Array<SymbolPrice> = [];
            for (const symbol of binanceSymbols) {
                try {
                    const singleUrl = `${this.baseUrl}/ticker/24hr?symbol=${symbol}`;
                    const singleResponse = await fetch(singleUrl, { method: 'GET' });
                    if (singleResponse.ok) {
                        const data: BinanceTickerResponse = await singleResponse.json();
                        results.push({
                            symbol: data.symbol,
                            price: Number.parseFloat(data.lastPrice),
                            priceChangePercent24h: Number.parseFloat(data.priceChangePercent),
                        });
                    }
                    // Skip invalid symbols silently
                } catch {
                    // Skip symbols that fail
                }
            }
            return results;
        }

        const data: Array<BinanceTickerResponse> = await response.json();

        return data.map(d => ({
            symbol: d.symbol,
            price: Number.parseFloat(d.lastPrice),
            priceChangePercent24h: Number.parseFloat(d.priceChangePercent),
        }));
    }

    /**
     * Get all tradable symbols from the exchange (public endpoint)
     * @param quoteAsset - Optional filter by quote asset (e.g., 'USDC')
     * @returns Array of tradable symbols
     */
    async getSymbols(quoteAsset?: string): Promise<Array<TradableSymbol>> {
        const url = `${this.baseUrl}/exchangeInfo`;

        const response = await fetch(url, {
            method: 'GET',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Binance API error: ${response.status} - ${errorData.msg || response.statusText}`);
        }

        const data: BinanceExchangeInfoResponse = await response.json();

        return data.symbols
            .filter(s => s.status === 'TRADING')
            .filter(s => !quoteAsset || s.quoteAsset === quoteAsset)
            .map(s => ({
                symbol: s.symbol,
                baseAsset: s.baseAsset,
                quoteAsset: s.quoteAsset,
                status: s.status as TradableSymbol['status'],
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
     * Get symbol filter info (LOT_SIZE and PRICE_FILTER) from exchange info
     * Results are cached to avoid repeated API calls
     * @param symbol - Trading pair symbol
     * @returns Symbol filter info with step/tick sizes
     */
    async getSymbolFilterInfo(symbol: string): Promise<SymbolFilterInfo> {
        const binanceSymbol = this.convertSymbol(symbol);

        // Check cache first
        const cached = this.symbolFilterCache.get(binanceSymbol);
        if (cached) {
            return cached;
        }

        // Fetch from exchange info endpoint
        const url = `${this.baseUrl}/exchangeInfo?symbol=${binanceSymbol}`;

        const response = await fetch(url, {
            method: 'GET',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Binance API error: ${response.status} - ${errorData.msg || response.statusText}`);
        }

        const data: BinanceExchangeInfoResponse = await response.json();

        if (data.symbols.length === 0) {
            throw new Error(`Symbol ${binanceSymbol} not found on Binance`);
        }

        const symbolInfo = data.symbols[0];
        const lotSizeFilter = symbolInfo.filters.find(
            (f): f is BinanceLotSizeFilter => f.filterType === 'LOT_SIZE'
        );
        const priceFilter = symbolInfo.filters.find(
            (f): f is BinancePriceFilter => f.filterType === 'PRICE_FILTER'
        );

        const filterInfo: SymbolFilterInfo = {
            stepSize: lotSizeFilter ? Number.parseFloat(lotSizeFilter.stepSize) : 1,
            minQty: lotSizeFilter ? Number.parseFloat(lotSizeFilter.minQty) : 0,
            maxQty: lotSizeFilter ? Number.parseFloat(lotSizeFilter.maxQty) : Number.MAX_SAFE_INTEGER,
            tickSize: priceFilter ? Number.parseFloat(priceFilter.tickSize) : 0.00000001,
            minPrice: priceFilter ? Number.parseFloat(priceFilter.minPrice) : 0,
            maxPrice: priceFilter ? Number.parseFloat(priceFilter.maxPrice) : Number.MAX_SAFE_INTEGER,
        };

        // Cache the result
        this.symbolFilterCache.set(binanceSymbol, filterInfo);

        return filterInfo;
    }

    /**
     * Round a value down to the nearest step size
     * Uses floor to avoid exceeding available balance
     * @param value - The value to round
     * @param stepSize - The step size to round to
     * @returns The rounded value as a string (to preserve precision)
     */
    private roundToStepSize(value: number, stepSize: number): string {
        if (stepSize === 0 || stepSize === 1) {
            return Math.floor(value).toString();
        }

        // Calculate precision from step size (e.g., 0.01 -> 2 decimals)
        const precision = this.getPrecisionFromStepSize(stepSize);

        // Round down to the nearest step size
        const rounded = Math.floor(value / stepSize) * stepSize;

        // Format with the correct number of decimal places
        return rounded.toFixed(precision);
    }

    /**
     * Get the number of decimal places from a step size
     * @param stepSize - The step size (e.g., 0.001)
     * @returns Number of decimal places (e.g., 3)
     */
    private getPrecisionFromStepSize(stepSize: number): number {
        if (stepSize >= 1) {
            return 0;
        }

        const stepStr = stepSize.toString();
        if (stepStr.includes('e-')) {
            // Handle scientific notation (e.g., 1e-8)
            return parseInt(stepStr.split('e-')[1], 10);
        }

        const decimalPart = stepStr.split('.')[1];
        return decimalPart ? decimalPart.length : 0;
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

        // Get symbol filter info for quantity/price precision
        const filterInfo = await this.getSymbolFilterInfo(data.symbol);

        // Round quantity to step size (floor to avoid exceeding balance)
        const roundedQuantity = this.roundToStepSize(data.quantity, filterInfo.stepSize);

        // Build order parameters
        const params = new URLSearchParams({
            symbol: binanceSymbol,
            side: data.side.toUpperCase(),
            type: this.mapOrderTypeToBinance(data.type),
            quantity: roundedQuantity,
            timestamp: timestamp.toString(),
            newOrderRespType: 'RESULT', // Request full response with status, side, etc.
        });

        // Add price for limit orders (including stop_loss_limit, take_profit_limit)
        if (this.isLimitType(data.type) && data.price !== undefined) {
            const roundedPrice = this.roundToStepSize(data.price, filterInfo.tickSize);
            params.append('price', roundedPrice);
            params.append('timeInForce', data.timeInForce || 'GTC');
        }

        // Add stop price for all stop orders
        if (this.isStopType(data.type) && data.stopPrice !== undefined) {
            const roundedStopPrice = this.roundToStepSize(data.stopPrice, filterInfo.tickSize);
            params.append('stopPrice', roundedStopPrice);
        }

        const queryString = params.toString();
        const signature = await this.sign(queryString);
        const url = `${this.baseUrl}/order?${queryString}&signature=${signature}`;

        // Log request parameters for debugging
        console.log('[BinanceClient] Creating order with params:', Object.fromEntries(params));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-MBX-APIKEY': this.apiKey!,
            },
        });

        const responseText = await response.text();
        let orderResponse: BinanceOrderResponse;

        try {
            orderResponse = JSON.parse(responseText);
        } catch {
            throw new Error(`Binance API error: Invalid JSON response - ${responseText}`);
        }

        // Log the response for debugging
        console.log('[BinanceClient] Order response:', JSON.stringify(orderResponse, null, 2));

        if (!response.ok) {
            const errorMsg = (orderResponse as { msg?: string }).msg || response.statusText;
            throw new Error(`Binance API error: ${response.status} - ${errorMsg}`);
        }

        // Check if response contains an error (Binance sometimes returns errors with 200)
        if ((orderResponse as { code?: number }).code && (orderResponse as { msg?: string }).msg) {
            throw new Error(`Binance API error: ${(orderResponse as { code?: number }).code} - ${(orderResponse as { msg?: string }).msg}`);
        }

        // Validate required fields exist
        if (!orderResponse.orderId || !orderResponse.symbol) {
            throw new Error(`Binance API error: Invalid order response - ${responseText}`);
        }

        return this.mapBinanceOrderToOrder(orderResponse);
    }

    /**
     * Map domain order type to Binance API order type
     */
    private mapOrderTypeToBinance(domainType: CreateOrderData['type']): string {
        const typeMap: Record<string, string> = {
            'market': 'MARKET',
            'limit': 'LIMIT',
            'stop_loss': 'STOP_LOSS',
            'stop_loss_limit': 'STOP_LOSS_LIMIT',
            'take_profit': 'TAKE_PROFIT',
            'take_profit_limit': 'TAKE_PROFIT_LIMIT',
        };
        return typeMap[domainType] || domainType.toUpperCase();
    }

    /**
     * Check if order type requires a price (limit orders)
     */
    private isLimitType(type: string): boolean {
        return ['limit', 'stop_loss_limit', 'take_profit_limit'].includes(type);
    }

    /**
     * Check if order type requires a stop price
     */
    private isStopType(type: string): boolean {
        return ['stop_loss', 'stop_loss_limit', 'take_profit', 'take_profit_limit'].includes(type);
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
            'STOP_LOSS': 'stop_loss',
            'STOP_LOSS_LIMIT': 'stop_loss_limit',
            'TAKE_PROFIT': 'take_profit',
            'TAKE_PROFIT_LIMIT': 'take_profit_limit',
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
     * Get all open orders for a symbol (requires authentication)
     * If no symbol is provided, returns all open orders across all symbols.
     * @param symbol - Trading pair (optional)
     * @returns Array of open orders
     */
    async getOrders(symbol?: string): Promise<Array<Order>> {
        if (!this.isAuthenticated()) {
            throw new Error('Authentication required: API key and secret must be provided');
        }

        const timestamp = Date.now();
        const params = new URLSearchParams({
            timestamp: timestamp.toString(),
        });

        // Add symbol if provided (convert format if needed)
        if (symbol) {
            const binanceSymbol = this.convertSymbol(symbol);
            params.append('symbol', binanceSymbol);
        }

        const queryString = params.toString();
        const signature = await this.sign(queryString);
        const url = `${this.baseUrl}/openOrders?${queryString}&signature=${signature}`;

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

        const data: Array<BinanceOpenOrderResponse> = await response.json();

        return data.map((order) => this.mapBinanceOpenOrderToOrder(order));
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
            throw new Error(`Binance API error: ${response.status} - ${errorData.msg || response.statusText}`);
        }

        const data: Array<BinanceOpenOrderResponse> = await response.json();

        // Filter to only filled orders and sort by time descending
        return data
            .filter((order) => order.status === 'FILLED')
            .map((order) => this.mapBinanceOpenOrderToOrder(order))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
                'STOP_LOSS': 'stop_loss',
                'STOP_LOSS_LIMIT': 'stop_loss_limit',
                'TAKE_PROFIT': 'take_profit',
                'TAKE_PROFIT_LIMIT': 'take_profit_limit',
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
