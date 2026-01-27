/**
 * Symbols Routes with OpenAPI documentation
 * Public endpoint for listing tradable symbols
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { HonoEnv } from '../types';
import type { IExchangeClient } from '@abeauvois/platform-trading-domain';

// OpenAPI schemas
const SymbolSearchResultSchema = z.object({
    symbol: z.string().openapi({ example: 'BTCUSDC', description: 'Trading pair symbol' }),
    baseAsset: z.string().openapi({ example: 'BTC', description: 'Base asset' }),
    price: z.number().openapi({ example: 97450.50, description: 'Current price' }),
    priceChangePercent24h: z.number().openapi({ example: 2.35, description: '24-hour price change percentage' }),
}).openapi('SymbolSearchResult');

const ErrorSchema = z.object({
    error: z.string().openapi({ example: 'Failed to fetch symbols', description: 'Error message' }),
}).openapi('SymbolsError');

// Route definitions
const getSymbolsRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Symbols'],
    summary: 'List tradable symbols',
    description: 'Get all tradable symbols filtered by quote asset. Includes current price and 24h change when withPrices is true.',
    request: {
        query: z.object({
            quoteAsset: z.string().optional().openapi({
                example: 'USDC',
                description: 'Filter by quote asset (e.g., USDC, USDT)',
            }),
            withPrices: z.string().optional().openapi({
                example: 'true',
                description: 'Include current price and 24h change data',
            }),
            search: z.string().optional().openapi({
                example: 'BTC',
                description: 'Filter by base asset name (case-insensitive)',
            }),
        }),
    },
    responses: {
        200: {
            description: 'Array of tradable symbols with optional price data',
            content: {
                'application/json': {
                    schema: z.array(SymbolSearchResultSchema),
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
 * Create symbols OpenAPI routes with dependency injection
 * @param exchangeClient - Exchange client instance (injected)
 * @returns OpenAPIHono app with symbols routes
 */
export function createSymbolsOpenApiRoutes(exchangeClient: IExchangeClient) {
    return new OpenAPIHono<HonoEnv>()
        .openapi(getSymbolsRoute, async (c) => {
            try {
                const { quoteAsset, withPrices, search } = c.req.valid('query');

                // Fetch all symbols filtered by quote asset
                const symbols = await exchangeClient.getSymbols(quoteAsset);

                // Apply search filter if provided
                let filteredSymbols = symbols;
                if (search) {
                    const searchUpper = search.toUpperCase();
                    filteredSymbols = symbols.filter(s =>
                        s.baseAsset.includes(searchUpper) || s.symbol.includes(searchUpper)
                    );
                }

                // If prices not requested, return basic symbol info with zero prices
                if (withPrices !== 'true') {
                    return c.json(filteredSymbols.map(s => ({
                        symbol: s.symbol,
                        baseAsset: s.baseAsset,
                        price: 0,
                        priceChangePercent24h: 0,
                    })), 200);
                }

                // Fetch prices for all filtered symbols
                const symbolNames = filteredSymbols.map(s => s.symbol);
                const prices = await exchangeClient.getTickers(symbolNames);

                // Create a price map for quick lookup
                const priceMap = new Map(prices.map(p => [p.symbol, p]));

                // Combine symbol info with prices
                const results = filteredSymbols.map(s => {
                    const priceData = priceMap.get(s.symbol);
                    return {
                        symbol: s.symbol,
                        baseAsset: s.baseAsset,
                        price: priceData?.price ?? 0,
                        priceChangePercent24h: priceData?.priceChangePercent24h ?? 0,
                    };
                });

                return c.json(results, 200);
            } catch (error) {
                console.error('Failed to fetch symbols:', error);
                return c.json({ error: 'Failed to fetch symbols' }, 500);
            }
        });
}
