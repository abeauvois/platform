/**
 * Balance Routes with OpenAPI documentation
 * Protected endpoints for account balance operations
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { HonoEnv } from '../types';
import type { IExchangeClient } from '@platform/trading-domain';

// OpenAPI schemas
const AccountBalanceSchema = z.object({
    asset: z.string().openapi({ example: 'BTC', description: 'Asset/coin symbol' }),
    free: z.number().openapi({ example: 1.5, description: 'Available balance' }),
    locked: z.number().openapi({ example: 0.5, description: 'Locked in orders/staking' }),
    total: z.number().openapi({ example: 2.0, description: 'Total balance (free + locked)' }),
}).openapi('AccountBalance');

const BalancesResponseSchema = z.object({
    exchange: z.string().openapi({ example: 'Binance', description: 'Exchange name' }),
    balances: z.array(AccountBalanceSchema).openapi({ description: 'List of non-zero balances' }),
    count: z.number().openapi({ example: 5, description: 'Number of assets with balance' }),
}).openapi('BalancesResponse');

const SingleBalanceResponseSchema = z.object({
    exchange: z.string().openapi({ example: 'Binance', description: 'Exchange name' }),
    balance: AccountBalanceSchema,
}).openapi('SingleBalanceResponse');

const ErrorSchema = z.object({
    error: z.string().openapi({ example: 'Failed to fetch balance', description: 'Error message' }),
}).openapi('BalanceError');

// Route definitions
const getAllBalancesRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Balance'],
    summary: 'Get all account balances',
    description: 'Fetch all non-zero account balances from exchange spot wallet. Requires API credentials.',
    responses: {
        200: {
            description: 'Account balances retrieved successfully',
            content: {
                'application/json': {
                    schema: BalancesResponseSchema,
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

const getAssetBalanceRoute = createRoute({
    method: 'get',
    path: '/{asset}',
    tags: ['Balance'],
    summary: 'Get balance for specific asset',
    description: 'Fetch balance for a specific cryptocurrency asset. Requires API credentials.',
    request: {
        params: z.object({
            asset: z.string().openapi({
                example: 'BTC',
                description: 'Asset symbol (e.g., BTC, ETH, USDT)',
            }),
        }),
    },
    responses: {
        200: {
            description: 'Asset balance retrieved successfully',
            content: {
                'application/json': {
                    schema: SingleBalanceResponseSchema,
                },
            },
        },
        404: {
            description: 'Asset not found',
            content: {
                'application/json': {
                    schema: ErrorSchema,
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
 * Create balance OpenAPI routes with dependency injection
 * @param exchangeClient - Authenticated exchange client instance (injected)
 * @returns OpenAPIHono app with balance routes
 */
export function createBalanceOpenApiRoutes(exchangeClient: IExchangeClient) {
    return new OpenAPIHono<HonoEnv>()
        .openapi(getAllBalancesRoute, async (c) => {
            try {
                const allBalances = await exchangeClient.getBalances();

                // Filter to only show non-zero balances
                const nonZeroBalances = allBalances.filter(b => b.total > 0);

                return c.json({
                    exchange: exchangeClient.getExchangeName(),
                    balances: nonZeroBalances,
                    count: nonZeroBalances.length,
                }, 200);
            } catch (error) {
                console.error('Failed to fetch balances: ', error);
                const message = error instanceof Error ? error.message : 'Failed to fetch balances';
                return c.json({ error: message }, 500);
            }
        })
        .openapi(getAssetBalanceRoute, async (c) => {
            try {
                const { asset } = c.req.valid('param');
                const balance = await exchangeClient.getBalance(asset);

                if (!balance) {
                    return c.json({ error: `Asset ${asset.toUpperCase()} not found` }, 404);
                }

                return c.json({
                    exchange: exchangeClient.getExchangeName(),
                    balance,
                }, 200);
            } catch (error) {
                console.error('Failed to fetch balance: ', error);
                const message = error instanceof Error ? error.message : 'Failed to fetch balance';
                return c.json({ error: message }, 500);
            }
        });
}
