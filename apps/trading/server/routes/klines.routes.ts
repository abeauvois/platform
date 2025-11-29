/**
 * Klines/Candlestick Routes
 * API endpoints for fetching historical candlestick data
 */

import { Hono } from 'hono';
import type { IExchangeClient } from '@platform/trading-domain';

/**
 * Create klines routes
 * @param exchangeClient - Exchange client instance
 * @returns Hono app with klines routes
 */
export function createKlinesRoutes(exchangeClient: IExchangeClient) {
    const app = new Hono();

    /**
     * GET /klines
     * Fetch historical candlestick/kline data
     * Query params:
     *   - symbol: Trading pair (default: 'BTCUSDT')
     *   - interval: Time interval (default: '1h')
     *   - limit: Number of candles (default: 100)
     */
    app.get('/', async (c) => {
        try {
            const symbol = c.req.query('symbol') || 'BTCUSDT';
            const interval = c.req.query('interval') || '1h';
            const limit = parseInt(c.req.query('limit') || '100');

            const klines = await exchangeClient.getKlines(symbol, interval, limit);

            return c.json({
                exchange: exchangeClient.getExchangeName(),
                symbol,
                interval,
                klines,
                count: klines.length
            });
        } catch (error) {
            console.error('Failed to fetch klines:', error);
            return c.json({
                error: error instanceof Error ? error.message : 'Failed to fetch klines'
            }, 500);
        }
    });

    return app;
}
