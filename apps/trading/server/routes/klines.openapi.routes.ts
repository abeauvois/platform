/**
 * Klines/Candlestick Routes with OpenAPI documentation
 * Public endpoints for historical candlestick data
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { BinanceClient } from '../adapters/BinanceClient.js';
import type { HonoEnv } from '../types';
import type { IExchangeClient } from '@platform/trading-domain';

// Create exchange client instance (using production API for real market data)
const exchangeClient: IExchangeClient = new BinanceClient();

// OpenAPI schemas
const CandlestickSchema = z.object({
    openTime: z.number().openapi({ example: 1699876800000, description: 'Open time (Unix timestamp in milliseconds)' }),
    open: z.number().openapi({ example: 92000.50, description: 'Opening price' }),
    high: z.number().openapi({ example: 92500.00, description: 'Highest price' }),
    low: z.number().openapi({ example: 91800.00, description: 'Lowest price' }),
    close: z.number().openapi({ example: 92300.00, description: 'Closing price' }),
    volume: z.number().openapi({ example: 150.123, description: 'Trading volume' }),
    closeTime: z.number().openapi({ example: 1699880399999, description: 'Close time (Unix timestamp in milliseconds)' }),
}).openapi('Candlestick');

const KlinesResponseSchema = z.object({
    exchange: z.string().openapi({ example: 'Binance Testnet', description: 'Exchange name' }),
    symbol: z.string().openapi({ example: 'BTCUSDT', description: 'Trading pair symbol' }),
    interval: z.string().openapi({ example: '1h', description: 'Candlestick interval' }),
    klines: z.array(CandlestickSchema).openapi({ description: 'Array of candlestick data' }),
    count: z.number().openapi({ example: 100, description: 'Number of candlesticks returned' }),
}).openapi('KlinesResponse');

const ErrorSchema = z.object({
    error: z.string().openapi({ example: 'Failed to fetch klines', description: 'Error message' }),
}).openapi('Error');

// Route definitions
const getKlinesRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Market Data'],
    summary: 'Get historical candlestick data',
    description: 'Fetch historical candlestick (OHLCV) data from Binance testnet exchange. Used for charting and technical analysis.',
    request: {
        query: z.object({
            symbol: z.string().optional().openapi({
                example: 'BTCUSDT',
                description: 'Trading pair symbol (default: BTCUSDT)',
            }),
            interval: z.string().optional().openapi({
                example: '1h',
                description: 'Candlestick interval: 1m, 5m, 15m, 30m, 1h, 4h, 1d, etc. (default: 1h)',
            }),
            limit: z.string().optional().openapi({
                example: '100',
                description: 'Number of candlesticks to fetch (default: 100, max: 1000)',
            }),
        }),
    },
    responses: {
        200: {
            description: 'Historical candlestick data',
            content: {
                'application/json': {
                    schema: KlinesResponseSchema,
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
export const klinesOpenApi = new OpenAPIHono<HonoEnv>()
    .openapi(getKlinesRoute, async (c) => {
        try {
            const { symbol = 'BTCUSDT', interval = '1h', limit = '100' } = c.req.valid('query');
            const klines = await exchangeClient.getKlines(symbol, interval, parseInt(limit));

            return c.json({
                exchange: exchangeClient.getExchangeName(),
                symbol,
                interval,
                klines,
                count: klines.length
            }, 200);
        } catch (error) {
            console.error('Failed to fetch klines:', error);
            return c.json({
                error: error instanceof Error ? error.message : 'Failed to fetch klines'
            }, 500);
        }
    });
