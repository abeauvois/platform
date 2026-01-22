/**
 * Watchlist Routes with OpenAPI documentation
 * Protected endpoints for watchlist operations - requires user authentication
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { HonoEnv } from '../types';
import type { IExchangeClient, IWatchlistRepository, IIdGenerator, IUserSettingsRepository } from '@platform/trading-domain';
import { authMiddleware } from '../middlewares/auth.middleware';

// OpenAPI schemas
const WatchlistItemSchema = z.object({
    symbol: z.string().openapi({ example: 'BTCUSDT', description: 'Trading pair symbol' }),
    price: z.number().openapi({ example: 92000.5, description: 'Current price' }),
    priceChangePercent24h: z.number().nullable().openapi({
        example: 2.35,
        description: '24h price change percentage',
    }),
    addedAt: z.string().datetime().openapi({
        example: '2024-01-15T12:00:00.000Z',
        description: 'When symbol was added to watchlist',
    }),
    referenceTimestamp: z.number().nullable().openapi({
        example: 1705320000000,
        description: 'Reference timestamp for price variation (Unix ms)',
    }),
    referencePrice: z.number().nullable().openapi({
        example: 88000.0,
        description: 'Price at reference point (calculated from kline data)',
    }),
    referencePriceChangePercent: z.number().nullable().openapi({
        example: 4.55,
        description: 'Price change percentage from reference to current',
    }),
}).openapi('WatchlistItem');

const WatchlistResponseSchema = z.array(WatchlistItemSchema).openapi('WatchlistResponse');

const AddSymbolRequestSchema = z.object({
    symbol: z.string().min(1).max(20).openapi({
        example: 'BTCUSDT',
        description: 'Trading pair symbol to add',
    }),
}).openapi('AddSymbolRequest');

const AddSymbolResponseSchema = z.object({
    symbol: z.string().openapi({ example: 'BTCUSDT', description: 'Added symbol' }),
    addedAt: z.string().datetime().openapi({
        example: '2024-01-15T12:00:00.000Z',
        description: 'When symbol was added',
    }),
}).openapi('AddSymbolResponse');

const ErrorSchema = z.object({
    error: z.string().openapi({ example: 'Symbol already in watchlist', description: 'Error message' }),
}).openapi('WatchlistError');

const UnauthorizedSchema = z.object({
    error: z.string().openapi({ example: 'Unauthorized', description: 'Authentication required' }),
}).openapi('UnauthorizedError');

const UpdateReferenceRequestSchema = z.object({
    timestamp: z.number().nullable().openapi({
        example: 1705320000000,
        description: 'Reference timestamp in Unix ms, or null to clear',
    }),
}).openapi('UpdateReferenceRequest');

const UpdateReferenceResponseSchema = z.object({
    symbol: z.string().openapi({ example: 'BTCUSDT', description: 'Symbol updated' }),
    referenceTimestamp: z.number().nullable().openapi({
        example: 1705320000000,
        description: 'New reference timestamp',
    }),
}).openapi('UpdateReferenceResponse');

// Route definitions
const getWatchlistRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Watchlist'],
    summary: 'Get user watchlist with prices',
    description: 'Fetch user watchlist with real-time price data for each symbol. Requires authentication.',
    security: [{ session: [] }],
    responses: {
        200: {
            description: 'Watchlist with current prices',
            content: {
                'application/json': {
                    schema: WatchlistResponseSchema,
                },
            },
        },
        401: {
            description: 'Unauthorized - authentication required',
            content: {
                'application/json': {
                    schema: UnauthorizedSchema,
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

const addSymbolRoute = createRoute({
    method: 'post',
    path: '/',
    tags: ['Watchlist'],
    summary: 'Add symbol to watchlist',
    description: 'Add a trading pair symbol to user watchlist. Requires authentication.',
    security: [{ session: [] }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: AddSymbolRequestSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'Symbol added successfully',
            content: {
                'application/json': {
                    schema: AddSymbolResponseSchema,
                },
            },
        },
        400: {
            description: 'Invalid request or symbol already exists',
            content: {
                'application/json': {
                    schema: ErrorSchema,
                },
            },
        },
        401: {
            description: 'Unauthorized - authentication required',
            content: {
                'application/json': {
                    schema: UnauthorizedSchema,
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

const removeSymbolRoute = createRoute({
    method: 'delete',
    path: '/{symbol}',
    tags: ['Watchlist'],
    summary: 'Remove symbol from watchlist',
    description: 'Remove a trading pair symbol from user watchlist. Requires authentication.',
    security: [{ session: [] }],
    request: {
        params: z.object({
            symbol: z.string().openapi({ example: 'BTCUSDT', description: 'Symbol to remove' }),
        }),
    },
    responses: {
        204: {
            description: 'Symbol removed successfully',
        },
        401: {
            description: 'Unauthorized - authentication required',
            content: {
                'application/json': {
                    schema: UnauthorizedSchema,
                },
            },
        },
        404: {
            description: 'Symbol not found in watchlist',
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

const updateReferenceRoute = createRoute({
    method: 'patch',
    path: '/{symbol}/reference',
    tags: ['Watchlist'],
    summary: 'Update reference timestamp for a symbol',
    description: 'Set or clear the reference timestamp for price variation calculation. Requires authentication.',
    security: [{ session: [] }],
    request: {
        params: z.object({
            symbol: z.string().openapi({ example: 'BTCUSDT', description: 'Symbol to update' }),
        }),
        body: {
            content: {
                'application/json': {
                    schema: UpdateReferenceRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Reference updated successfully',
            content: {
                'application/json': {
                    schema: UpdateReferenceResponseSchema,
                },
            },
        },
        401: {
            description: 'Unauthorized - authentication required',
            content: {
                'application/json': {
                    schema: UnauthorizedSchema,
                },
            },
        },
        404: {
            description: 'Symbol not found in watchlist',
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

/** Default number of klines back to use when no reference is set */
const DEFAULT_REFERENCE_KLINES_BACK = 10;

/**
 * Calculate reference price from klines data
 * @param klines - Array of candlesticks
 * @param referenceTimestamp - Timestamp to find price for, or null for default (10 klines back)
 * @param currentPrice - Current price for calculating variation
 * @returns Reference price data or nulls if not calculable
 */
function calculateReferencePrice(
    klines: Array<{ openTime: number; close: number }>,
    referenceTimestamp: number | null,
    currentPrice: number
): { referencePrice: number | null; referencePriceChangePercent: number | null } {
    if (klines.length === 0) {
        return { referencePrice: null, referencePriceChangePercent: null };
    }

    let referencePrice: number | null = null;

    if (referenceTimestamp === null) {
        // Use default: 10 klines back (or first available if less)
        const backIndex = Math.max(0, klines.length - DEFAULT_REFERENCE_KLINES_BACK);
        referencePrice = klines[backIndex].close;
    } else {
        // Find kline containing the reference timestamp
        for (const kline of klines) {
            if (kline.openTime <= referenceTimestamp) {
                referencePrice = kline.close;
            } else {
                break;
            }
        }
        // If timestamp is before all klines, use first kline
        if (referencePrice === null && klines.length > 0) {
            referencePrice = klines[0].close;
        }
    }

    if (referencePrice === null || referencePrice === 0) {
        return { referencePrice: null, referencePriceChangePercent: null };
    }

    const referencePriceChangePercent = ((currentPrice - referencePrice) / referencePrice) * 100;
    return { referencePrice, referencePriceChangePercent };
}

/**
 * Create watchlist OpenAPI routes with dependency injection
 * @param watchlistRepo - Watchlist repository instance (injected)
 * @param exchangeClient - Exchange client for fetching prices (injected)
 * @param idGenerator - ID generator for creating watchlist item IDs (injected)
 * @param settingsRepo - User settings repository for fetching global reference timestamp (injected)
 * @returns OpenAPIHono app with watchlist routes
 */
export function createWatchlistOpenApiRoutes(
    watchlistRepo: IWatchlistRepository,
    exchangeClient: IExchangeClient,
    idGenerator: IIdGenerator,
    settingsRepo: IUserSettingsRepository
) {
    const app = new OpenAPIHono<HonoEnv>();

    // Require user authentication for all watchlist routes
    app.use('/*', authMiddleware);

    return app
        .openapi(getWatchlistRoute, async (c) => {
            try {
                const user = c.get('user');
                const items = await watchlistRepo.findByUserId(user.id);

                if (items.length === 0) {
                    return c.json([], 200);
                }

                // Fetch global reference timestamp from user settings
                const settings = await settingsRepo.findByUserId(user.id);
                const globalReferenceTimestamp = settings?.globalReferenceTimestamp ?? null;

                // Batch fetch prices for all symbols
                const symbols = items.map((item) => item.symbol);
                const prices = await exchangeClient.getTickers(symbols);

                // Create price lookup map
                const priceMap = new Map(prices.map((p) => [p.symbol, p]));

                // Fetch klines for reference price calculation (in parallel)
                // Use 100 klines to cover longer reference periods (up to ~4 days for 1h interval)
                const klinesPromises = symbols.map((symbol) =>
                    exchangeClient.getKlines(symbol, '1h', 100).catch(() => [])
                );
                const klinesResults = await Promise.all(klinesPromises);
                const klinesMap = new Map(symbols.map((s, i) => [s, klinesResults[i]]));

                // Combine watchlist with price data and reference calculations
                // Use global reference timestamp for ALL items
                const result = items.map((item) => {
                    const currentPrice = priceMap.get(item.symbol)?.price ?? 0;
                    const klines = klinesMap.get(item.symbol) ?? [];
                    const { referencePrice, referencePriceChangePercent } = calculateReferencePrice(
                        klines,
                        globalReferenceTimestamp,
                        currentPrice
                    );

                    return {
                        symbol: item.symbol,
                        price: currentPrice,
                        priceChangePercent24h: priceMap.get(item.symbol)?.priceChangePercent24h ?? null,
                        addedAt: item.createdAt.toISOString(),
                        referenceTimestamp: globalReferenceTimestamp,
                        referencePrice,
                        referencePriceChangePercent,
                    };
                });

                return c.json(result, 200);
            } catch (error) {
                console.error('Failed to fetch watchlist:', error);
                const message = error instanceof Error ? error.message : 'Failed to fetch watchlist';
                return c.json({ error: message }, 500);
            }
        })
        .openapi(addSymbolRoute, async (c) => {
            try {
                const user = c.get('user');
                const { symbol } = c.req.valid('json');
                const normalizedSymbol = symbol.toUpperCase();

                // Check if already exists
                if (await watchlistRepo.exists(user.id, normalizedSymbol)) {
                    return c.json({ error: 'Symbol already in watchlist' }, 400);
                }

                const item = await watchlistRepo.add({
                    id: idGenerator.generate(),
                    userId: user.id,
                    symbol: normalizedSymbol,
                });

                return c.json(
                    {
                        symbol: item.symbol,
                        addedAt: item.createdAt.toISOString(),
                    },
                    201
                );
            } catch (error) {
                console.error('Failed to add symbol:', error);
                const message = error instanceof Error ? error.message : 'Failed to add symbol to watchlist';
                return c.json({ error: message }, 500);
            }
        })
        .openapi(removeSymbolRoute, async (c) => {
            try {
                const user = c.get('user');
                const { symbol } = c.req.valid('param');

                const removed = await watchlistRepo.remove(user.id, symbol.toUpperCase());

                if (!removed) {
                    return c.json({ error: 'Symbol not found in watchlist' }, 404);
                }

                return c.body(null, 204);
            } catch (error) {
                console.error('Failed to remove symbol:', error);
                const message = error instanceof Error ? error.message : 'Failed to remove symbol from watchlist';
                return c.json({ error: message }, 500);
            }
        })
        .openapi(updateReferenceRoute, async (c) => {
            try {
                const user = c.get('user');
                const { symbol } = c.req.valid('param');
                const { timestamp } = c.req.valid('json');
                const normalizedSymbol = symbol.toUpperCase();

                const updated = await watchlistRepo.updateReference(user.id, normalizedSymbol, timestamp);

                if (!updated) {
                    return c.json({ error: 'Symbol not found in watchlist' }, 404);
                }

                return c.json({
                    symbol: normalizedSymbol,
                    referenceTimestamp: timestamp,
                }, 200);
            } catch (error) {
                console.error('Failed to update reference:', error);
                const message = error instanceof Error ? error.message : 'Failed to update reference';
                return c.json({ error: message }, 500);
            }
        });
}
