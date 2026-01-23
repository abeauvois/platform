/**
 * Credits Routes with OpenAPI documentation
 * Endpoints for credit balance and transaction management
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { HonoEnv } from '../types';
import type { CreditService } from '@platform/gamification-domain';
import { authMiddleware } from '../middlewares/auth.middleware';

// OpenAPI schemas
const CreditBalanceSchema = z.object({
    userId: z.string().openapi({ description: 'User ID' }),
    balance: z.number().openapi({ example: 45, description: 'Current credit balance (can be negative)' }),
    lifetimeSpent: z.number().openapi({ example: 5, description: 'Total credits spent' }),
    tier: z.enum(['free', 'paid_tier1', 'paid_tier2']).openapi({ description: 'User tier' }),
    lastActivityDate: z.string().nullable().openapi({ description: 'Last activity date (YYYY-MM-DD)' }),
    createdAt: z.string().openapi({ description: 'Balance creation date' }),
    updatedAt: z.string().openapi({ description: 'Last update date' }),
}).openapi('CreditBalance');

const AccessContextSchema = z.object({
    canTrade: z.boolean().openapi({ description: 'Whether user can execute trades' }),
    canViewRealtime: z.boolean().openapi({ description: 'Whether user can view real-time data' }),
    showAds: z.boolean().openapi({ description: 'Whether to show ads' }),
    requiresUpgrade: z.boolean().openapi({ description: 'Whether user needs to upgrade' }),
    requiredCredits: z.number().openapi({ description: 'Credits needed to resume trading' }),
    currentDebt: z.number().openapi({ description: 'Current debt amount (0 if positive balance)' }),
    restrictionReason: z.string().nullable().openapi({ description: 'Reason for restricted access' }),
}).openapi('AccessContext');

const CreditTransactionSchema = z.object({
    id: z.string().openapi({ description: 'Transaction ID' }),
    userId: z.string().openapi({ description: 'User ID' }),
    type: z.enum(['daily_active', 'trade', 'purchase', 'refund', 'bonus']).openapi({ description: 'Transaction type' }),
    amount: z.number().openapi({ description: 'Amount (positive for additions, negative for deductions)' }),
    balanceAfter: z.number().openapi({ description: 'Balance after transaction' }),
    referenceId: z.string().nullable().openapi({ description: 'Reference ID (e.g., order ID)' }),
    referenceType: z.string().nullable().openapi({ description: 'Reference type (e.g., "order")' }),
    createdAt: z.string().openapi({ description: 'Transaction date' }),
}).openapi('CreditTransaction');

const TradeAccessResultSchema = z.object({
    allowed: z.boolean().openapi({ description: 'Whether trade is allowed' }),
    reason: z.string().nullable().openapi({ description: 'Reason if not allowed' }),
    requiredCredits: z.number().openapi({ description: 'Credits needed if not allowed' }),
}).openapi('TradeAccessResult');

const ErrorSchema = z.object({
    error: z.string().openapi({ description: 'Error message' }),
}).openapi('CreditError');

// Route definitions
const getBalanceRoute = createRoute({
    method: 'get',
    path: '/balance',
    tags: ['Credits'],
    summary: 'Get credit balance',
    description: 'Get current user credit balance and tier information.',
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Credit balance retrieved successfully',
            content: { 'application/json': { schema: CreditBalanceSchema } },
        },
        401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: ErrorSchema } },
        },
    },
});

const getAccessContextRoute = createRoute({
    method: 'get',
    path: '/access',
    tags: ['Credits'],
    summary: 'Get access context',
    description: 'Get current access context based on balance and tier.',
    security: [{ bearerAuth: [] }],
    request: {
        query: z.object({
            orderValue: z.string().optional().openapi({ description: 'Order value to check (USD)' }),
        }),
    },
    responses: {
        200: {
            description: 'Access context retrieved successfully',
            content: { 'application/json': { schema: AccessContextSchema } },
        },
        401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: ErrorSchema } },
        },
    },
});

const getTransactionsRoute = createRoute({
    method: 'get',
    path: '/transactions',
    tags: ['Credits'],
    summary: 'Get transaction history',
    description: 'Get credit transaction history.',
    security: [{ bearerAuth: [] }],
    request: {
        query: z.object({
            limit: z.string().optional().openapi({ description: 'Number of transactions (default 50)' }),
            offset: z.string().optional().openapi({ description: 'Offset for pagination' }),
        }),
    },
    responses: {
        200: {
            description: 'Transactions retrieved successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        transactions: z.array(CreditTransactionSchema),
                        count: z.number(),
                    }),
                },
            },
        },
        401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: ErrorSchema } },
        },
    },
});

const canTradeRoute = createRoute({
    method: 'get',
    path: '/can-trade',
    tags: ['Credits'],
    summary: 'Check trade permission',
    description: 'Check if user can execute a trade of a given value.',
    security: [{ bearerAuth: [] }],
    request: {
        query: z.object({
            orderValue: z.string().openapi({ description: 'Order value in USD' }),
        }),
    },
    responses: {
        200: {
            description: 'Trade access result',
            content: { 'application/json': { schema: TradeAccessResultSchema } },
        },
        401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: ErrorSchema } },
        },
    },
});

const chargeForTradeRoute = createRoute({
    method: 'post',
    path: '/charge-trade',
    tags: ['Credits'],
    summary: 'Charge for trade',
    description: 'Deduct credits for an executed trade. Called after successful trade execution.',
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: z.object({
                        orderId: z.string().openapi({ description: 'Order ID' }),
                        tradeAmount: z.number().openapi({ description: 'Trade amount in USD' }),
                    }),
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Trade charged successfully',
            content: { 'application/json': { schema: CreditTransactionSchema } },
        },
        400: {
            description: 'Trade not allowed',
            content: { 'application/json': { schema: ErrorSchema } },
        },
        401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: ErrorSchema } },
        },
    },
});

const trackActivityRoute = createRoute({
    method: 'post',
    path: '/track-activity',
    tags: ['Credits'],
    summary: 'Track user activity',
    description: 'Track user activity. Charges 1 credit on first API call of the day.',
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Activity tracked',
            content: {
                'application/json': {
                    schema: z.object({
                        charged: z.boolean().openapi({ description: 'Whether a charge was made' }),
                    }),
                },
            },
        },
        401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: ErrorSchema } },
        },
    },
});

/**
 * Create credits OpenAPI routes with dependency injection
 */
export function createCreditsOpenApiRoutes(creditService: CreditService) {
    const app = new OpenAPIHono<HonoEnv>();

    // Apply auth middleware to all routes
    app.use('/*', authMiddleware);

    return app
        .openapi(getBalanceRoute, async (c) => {
            try {
                const user = c.get('user');
                const balance = await creditService.getBalance(user.id);
                return c.json({
                    ...balance,
                    createdAt: balance.createdAt.toISOString(),
                    updatedAt: balance.updatedAt.toISOString(),
                }, 200);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to get balance';
                return c.json({ error: message }, 500);
            }
        })
        .openapi(getAccessContextRoute, async (c) => {
            try {
                const user = c.get('user');
                const { orderValue } = c.req.valid('query');
                const context = await creditService.getAccessContext(
                    user.id,
                    orderValue ? parseFloat(orderValue) : undefined
                );
                return c.json(context, 200);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to get access context';
                return c.json({ error: message }, 500);
            }
        })
        .openapi(getTransactionsRoute, async (c) => {
            try {
                const user = c.get('user');
                const { limit, offset } = c.req.valid('query');
                const transactions = await creditService.getTransactions(
                    user.id,
                    limit ? parseInt(limit) : 50,
                    offset ? parseInt(offset) : 0
                );
                return c.json({
                    transactions: transactions.map((t) => ({
                        ...t,
                        createdAt: t.createdAt.toISOString(),
                    })),
                    count: transactions.length,
                }, 200);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to get transactions';
                return c.json({ error: message }, 500);
            }
        })
        .openapi(canTradeRoute, async (c) => {
            try {
                const user = c.get('user');
                const { orderValue } = c.req.valid('query');
                const result = await creditService.canExecuteTrade(
                    user.id,
                    parseFloat(orderValue)
                );
                return c.json(result, 200);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to check trade permission';
                return c.json({ error: message }, 500);
            }
        })
        .openapi(chargeForTradeRoute, async (c) => {
            try {
                const user = c.get('user');
                const { orderId, tradeAmount } = c.req.valid('json');
                const transaction = await creditService.deductForTrade(
                    user.id,
                    orderId,
                    tradeAmount
                );
                return c.json({
                    ...transaction,
                    createdAt: transaction.createdAt.toISOString(),
                }, 200);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to charge for trade';
                return c.json({ error: message }, 400);
            }
        })
        .openapi(trackActivityRoute, async (c) => {
            try {
                const user = c.get('user');
                // Track activity charges on first call of the day
                await creditService.trackActivity(user.id);
                return c.json({ charged: true }, 200);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to track activity';
                return c.json({ error: message }, 500);
            }
        });
}
