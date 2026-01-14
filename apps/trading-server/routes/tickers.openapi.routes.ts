/**
 * Tickers Routes with OpenAPI documentation
 * Public endpoint for batch price fetching
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { HonoEnv } from '../types';
import type { IExchangeClient } from '@platform/trading-domain';

// OpenAPI schemas
const SymbolPriceSchema = z.object({
    symbol: z.string().openapi({ example: 'BTCUSDT', description: 'Trading pair symbol' }),
    price: z.number().openapi({ example: 92000.50, description: 'Current price' }),
    priceChangePercent24h: z.number().optional().openapi({ example: 2.35, description: '24-hour price change percentage' }),
}).openapi('SymbolPrice');

const ErrorSchema = z.object({
    error: z.string().openapi({ example: 'Failed to fetch prices', description: 'Error message' }),
}).openapi('TickersError');

// Route definitions
const getTickersRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Ticker'],
    summary: 'Get multiple ticker prices',
    description: 'Fetch current prices for multiple trading pairs in a single request. Uses lightweight endpoint that returns only symbol and price.',
    request: {
        query: z.object({
            symbols: z.string().openapi({
                example: 'BTCUSDT,ETHUSDT,BNBUSDT',
                description: 'Comma-separated list of trading pair symbols',
            }),
        }),
    },
    responses: {
        200: {
            description: 'Array of symbol prices',
            content: {
                'application/json': {
                    schema: z.array(SymbolPriceSchema),
                },
            },
        },
        400: {
            description: 'Bad request - symbols parameter required',
            content: {
                'application/json': {
                    schema: ErrorSchema,
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

/**
 * Create tickers OpenAPI routes with dependency injection
 * @param exchangeClient - Exchange client instance (injected)
 * @returns OpenAPIHono app with tickers routes
 */
export function createTickersOpenApiRoutes(exchangeClient: IExchangeClient) {
    return new OpenAPIHono<HonoEnv>()
        .openapi(getTickersRoute, async (c) => {
            try {
                const { symbols } = c.req.valid('query');

                if (!symbols || symbols.trim() === '') {
                    return c.json({ error: 'symbols parameter is required' }, 400);
                }

                const symbolList = symbols.split(',').map(s => s.trim()).filter(s => s.length > 0);

                if (symbolList.length === 0) {
                    return c.json([], 200);
                }

                const prices = await exchangeClient.getTickers(symbolList);

                return c.json(prices, 200);
            } catch (error) {
                console.error('Failed to fetch prices: ', error);
                return c.json({ error: 'Failed to fetch prices' }, 500);
            }
        });
}
