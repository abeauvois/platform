/**
 * Margin Balance Routes with OpenAPI documentation
 * Protected endpoints for margin account balance operations
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { HonoEnv } from '../types';
import type { IExchangeClient } from '@platform/trading-domain';

// OpenAPI schemas
const MarginBalanceSchema = z.object({
    asset: z.string().openapi({ example: 'BTC', description: 'Asset/coin symbol' }),
    free: z.number().openapi({ example: 1.5, description: 'Available balance' }),
    locked: z.number().openapi({ example: 0.5, description: 'Locked in orders' }),
    borrowed: z.number().openapi({ example: 0.2, description: 'Borrowed amount' }),
    interest: z.number().openapi({ example: 0.001, description: 'Accrued interest' }),
    netAsset: z.number().openapi({ example: 1.799, description: 'Net asset value (free + locked - borrowed - interest)' }),
}).openapi('MarginBalance');

const MarginBalancesResponseSchema = z.object({
    exchange: z.string().openapi({ example: 'Binance', description: 'Exchange name' }),
    balances: z.array(MarginBalanceSchema).openapi({ description: 'List of margin balances' }),
    count: z.number().openapi({ example: 3, description: 'Number of assets with margin balance' }),
}).openapi('MarginBalancesResponse');

const ErrorSchema = z.object({
    error: z.string().openapi({ example: 'Failed to fetch margin balance', description: 'Error message' }),
}).openapi('MarginBalanceError');

// Route definitions
const getAllMarginBalancesRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Margin'],
    summary: 'Get all margin account balances',
    description: 'Fetch all margin account balances from exchange. Includes borrowed amounts and interest. Requires API credentials.',
    responses: {
        200: {
            description: 'Margin account balances retrieved successfully',
            content: {
                'application/json': {
                    schema: MarginBalancesResponseSchema,
                },
            },
        },
        500: {
            description: 'Server error or authentication failure',
            content: {
                'application/json': {
                    schema: ErrorSchema,
                },
            },
        },
    },
});

/**
 * Create margin balance OpenAPI routes with dependency injection
 * @param exchangeClient - Authenticated exchange client instance (injected)
 * @returns OpenAPIHono app with margin balance routes
 */
export function createMarginBalanceOpenApiRoutes(exchangeClient: IExchangeClient) {
    return new OpenAPIHono<HonoEnv>()
        .openapi(getAllMarginBalancesRoute, async (c) => {
            try {
                const allBalances = await exchangeClient.getMarginBalances();

                // Filter to only show non-zero net asset balances
                const nonZeroBalances = allBalances.filter(b =>
                    b.netAsset !== 0 || b.borrowed !== 0 || b.interest !== 0
                );

                return c.json({
                    exchange: exchangeClient.getExchangeName(),
                    balances: nonZeroBalances,
                    count: nonZeroBalances.length,
                }, 200);
            } catch (error) {
                console.error('Failed to fetch margin balances: ', error);
                const message = error instanceof Error ? error.message : 'Failed to fetch margin balances';
                return c.json({ error: message }, 500);
            }
        });
}
