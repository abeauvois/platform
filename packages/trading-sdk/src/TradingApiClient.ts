import { BaseClient } from '@platform/sdk';
import type { ILogger } from '@platform/platform-domain';
import type {
    Position,
    Order,
    CreateOrderData,
    MarketTicker,
    MarketTickerResponse,
    Portfolio,
    Trade,
} from '@platform/trading-domain';

interface TradingApiClientConfig {
    baseUrl: string;
    sessionToken?: string;
    logger: ILogger;
}

/**
 * Trading API Client
 * Extends BaseClient to reuse authentication functionality
 * Adds trading-specific operations for positions, orders, and market data
 */
export class TradingApiClient extends BaseClient {
    constructor(config: TradingApiClientConfig) {
        super(config);
    }

    /**
     * Helper method to parse JSON response with proper typing
     * Encapsulates the type assertion in a single location
     */
    private async parseJsonResponse<T>(response: Response): Promise<T> {
        const data = await response.json();
        return data as T;
    }

    // ============================================
    // Portfolio & Account Methods
    // ============================================

    /**
     * Get current portfolio summary
     * Requires authentication
     */
    async getPortfolio(): Promise<Portfolio> {
        try {
            this.logger.info('Fetching portfolio...');

            const portfolio = await this.authenticatedRequest<Portfolio>('/api/trading/portfolio', {
                method: 'GET',
            });

            this.logger.info('Portfolio fetched successfully');
            return portfolio;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching portfolio: ${errorMessage}`);
            throw error;
        }
    }

    // ============================================
    // Position Methods
    // ============================================

    /**
     * Get all open positions
     * Requires authentication
     */
    async getPositions(): Promise<Position[]> {
        try {
            this.logger.info('Fetching positions...');

            const positions = await this.authenticatedRequest<Position[]>('/api/trading/positions', {
                method: 'GET',
            });

            this.logger.info(`Fetched ${positions.length} positions`);
            return positions;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching positions: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get a specific position by ID
     * Requires authentication
     */
    async getPosition(positionId: string): Promise<Position> {
        try {
            this.logger.info(`Fetching position ${positionId}...`);

            const position = await this.authenticatedRequest<Position>(
                `/api/trading/positions/${positionId}`,
                { method: 'GET' }
            );

            this.logger.info('Position fetched successfully');
            return position;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching position: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Close a position
     * Requires authentication
     */
    async closePosition(positionId: string): Promise<void> {
        try {
            this.logger.info(`Closing position ${positionId}...`);

            await this.authenticatedRequest<void>(
                `/api/trading/positions/${positionId}/close`,
                { method: 'POST' }
            );

            this.logger.info('Position closed successfully');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error closing position: ${errorMessage}`);
            throw error;
        }
    }

    // ============================================
    // Order Methods
    // ============================================

    /**
     * Create a new order
     * Requires authentication
     */
    async createOrder(data: CreateOrderData): Promise<Order> {
        try {
            this.logger.info(`Creating ${data.side} order for ${data.symbol}...`);

            const order = await this.authenticatedRequest<Order>('/api/trading/orders', {
                method: 'POST',
                body: JSON.stringify(data),
            });

            this.logger.info('Order created successfully');
            return order;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error creating order: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get all orders (optionally filtered by symbol and status)
     * Requires authentication
     */
    async getOrders(symbol?: string, status?: string): Promise<Order[]> {
        try {
            this.logger.info('Fetching orders...');

            const params = new URLSearchParams();
            if (symbol) params.append('symbol', symbol);
            if (status) params.append('status', status);

            const queryString = params.toString();
            const endpoint = queryString
                ? `/api/trading/orders?${queryString}`
                : '/api/trading/orders';

            const orders = await this.authenticatedRequest<Order[]>(endpoint, {
                method: 'GET',
            });

            this.logger.info(`Fetched ${orders.length} orders`);
            return orders;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching orders: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get a specific order by ID
     * Requires authentication
     */
    async getOrder(orderId: string): Promise<Order> {
        try {
            this.logger.info(`Fetching order ${orderId}...`);

            const order = await this.authenticatedRequest<Order>(
                `/api/trading/orders/${orderId}`,
                { method: 'GET' }
            );

            this.logger.info('Order fetched successfully');
            return order;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching order: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Cancel an order
     * Requires authentication
     */
    async cancelOrder(orderId: string): Promise<void> {
        try {
            this.logger.info(`Canceling order ${orderId}...`);

            await this.authenticatedRequest<void>(
                `/api/trading/orders/${orderId}/cancel`,
                { method: 'POST' }
            );

            this.logger.info('Order cancelled successfully');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error canceling order: ${errorMessage}`);
            throw error;
        }
    }

    // ============================================
    // Market Data Methods (Public)
    // ============================================

    /**
     * Get ticker data
     * Does not require authentication
     */
    async getTicker(): Promise<MarketTicker> {
        try {
            this.logger.info('Fetching ticker...');

            const response = await fetch(
                `${this.baseUrl}/api/trading/ticker`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch ticker: ${response.statusText}`);
            }

            const tickerResponse = await this.parseJsonResponse<MarketTickerResponse>(response);
            this.logger.info('Ticker fetched successfully');
            return { ...tickerResponse, timestamp: new Date(tickerResponse.timestamp) };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching ticker: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get market ticker for a symbol
     * Does not require authentication
     */
    async getMarketTicker(symbol: string): Promise<MarketTicker> {
        try {
            this.logger.info(`Fetching market ticker for ${symbol}...`);

            const response = await fetch(
                `${this.baseUrl}/api/trading/market/ticker/${symbol}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch ticker: ${response.statusText}`);
            }

            const tickerResponse = await this.parseJsonResponse<MarketTickerResponse>(response);
            this.logger.info('Market ticker fetched successfully');
            return { ...tickerResponse, timestamp: new Date(tickerResponse.timestamp) };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching market ticker: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get multiple market tickers
     * Does not require authentication
     */
    async getMarketTickers(symbols?: string[]): Promise<MarketTicker[]> {
        try {
            this.logger.info('Fetching market tickers...');

            const params = symbols && symbols.length > 0
                ? `?symbols=${symbols.join(',')}`
                : '';

            const response = await fetch(
                `${this.baseUrl}/api/trading/market/tickers${params}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch tickers: ${response.statusText}`);
            }

            const tickersResponse = await this.parseJsonResponse<MarketTickerResponse[]>(response);
            this.logger.info(`Fetched ${tickersResponse.length} market tickers`);
            return tickersResponse.map(ticker => ({
                ...ticker,
                timestamp: new Date(ticker.timestamp)
            }));

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching market tickers: ${errorMessage}`);
            throw error;
        }
    }

    // ============================================
    // Trade History Methods
    // ============================================

    /**
     * Get trade history
     * Requires authentication
     */
    async getTradeHistory(symbol?: string, limit?: number): Promise<Trade[]> {
        try {
            this.logger.info('Fetching trade history...');

            const params = new URLSearchParams();
            if (symbol) params.append('symbol', symbol);
            if (limit) params.append('limit', limit.toString());

            const queryString = params.toString();
            const endpoint = queryString
                ? `/api/trading/trades?${queryString}`
                : '/api/trading/trades';

            const trades = await this.authenticatedRequest<Trade[]>(endpoint, {
                method: 'GET',
            });

            this.logger.info(`Fetched ${trades.length} trades`);
            return trades;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching trade history: ${errorMessage}`);
            throw error;
        }
    }

}
