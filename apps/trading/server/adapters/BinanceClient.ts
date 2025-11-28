/**
 * Binance Exchange Client Adapter
 * Implements IExchangeClient interface for Binance API
 * 
 * Infrastructure layer adapter for fetching market data from Binance
 * Supports both public (unauthenticated) and private (authenticated) endpoints
 */

import type { IExchangeClient, MarketTicker, AccountBalance } from '@platform/trading-domain';

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
     * Get all account balances (requires authentication)
     * @returns Array of account balances for all assets
     */
    async getBalances(): Promise<AccountBalance[]> {
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
