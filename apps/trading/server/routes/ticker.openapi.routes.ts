/**
 * Ticker Routes with OpenAPI documentation
 * Public endpoints for market ticker data
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { HonoEnv } from '../types';
import { BinanceClient } from '../adapters/BinanceClient.js';
import type { IExchangeClient } from '@platform/trading-domain';

// Create exchange client instance (can be swapped for different exchanges)
const exchangeClient: IExchangeClient = new BinanceClient();

// OpenAPI schemas
const MarketTickerSchema = z.object({
    symbol: z.string().openapi({ example: 'BTCUSDT', description: 'Trading pair symbol' }),
    lastPrice: z.number().openapi({ example: 92000.50, description: 'Last traded price' }),
    bidPrice: z.number().openapi({ example: 91995.00, description: 'Current best bid price' }),
    askPrice: z.number().openapi({ example: 92005.00, description: 'Current best ask price' }),
    volume24h: z.number().openapi({ example: 15000.123, description: '24-hour trading volume' }),
    high24h: z.number().openapi({ example: 93000.00, description: '24-hour high price' }),
    low24h: z.number().openapi({ example: 90000.00, description: '24-hour low price' }),
    priceChange24h: z.number().openapi({ example: 1500.00, description: '24-hour price change' }),
    priceChangePercent24h: z.number().openapi({ example: 1.65, description: '24-hour price change percentage' }),
    timestamp: z.string().datetime().openapi({ example: '2024-01-15T12:00:00Z', description: 'Timestamp of the data' }),
}).openapi('MarketTicker');

const ErrorSchema = z.object({
    error: z.string().openapi({ example: 'Failed to fetch ticker', description: 'Error message' }),
}).openapi('Error');

// Route definitions
const getTickerRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Ticker'],
    summary: 'Get market ticker',
    description: 'Fetch real-time market ticker data from Binance exchange. Defaults to BTC/USD if no symbol provided.',
    request: {
        query: z.object({
            symbol: z.string().optional().openapi({
                example: 'BTC/USD',
                description: 'Trading pair symbol. Supports formats like "BTC/USD" or "BTCUSDT"',
            }),
        }),
    },
    responses: {
        200: {
            description: 'Market ticker data',
            content: {
                'application/json': {
                    schema: MarketTickerSchema,
                },
            },
        },
        500: {
            description: 'Server error',
            content: {
                'application/json': {
                    schema: ErrorSchema,
                },
            },
        },
    },
});

// Create OpenAPI Hono app
export const tickerOpenApi = new OpenAPIHono<HonoEnv>()
    .openapi(getTickerRoute, async (c) => {
        try {
            const { symbol = 'BTC/USD' } = c.req.valid('query');
            const ticker = await exchangeClient.getTicker(symbol);

            return c.json({
                ...ticker,
                timestamp: ticker.timestamp.toISOString(),
            }, 200);
        } catch (error) {
            console.error('Failed to fetch ticker: ', error);
            return c.json({ error: 'Failed to fetch ticker' }, 500);
        }
    });
