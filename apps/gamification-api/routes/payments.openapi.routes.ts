/**
 * Payments Routes with OpenAPI documentation
 * Endpoints for payment and credit purchase
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { HonoEnv } from '../types';
import type { PaymentService } from '@platform/gamification-domain';
import { CREDITS_PER_EUR, TIER2_MIN_PURCHASE } from '@platform/gamification-domain';
import { authMiddleware } from '../middlewares/auth.middleware';

// OpenAPI schemas
const PaymentIntentRequestSchema = z.object({
    amountEur: z.number().min(100).openapi({
        example: 1000,
        description: 'Amount in EUR cents (min 100 = 1 EUR)',
    }),
}).openapi('PaymentIntentRequest');

const PaymentIntentResponseSchema = z.object({
    clientSecret: z.string().openapi({ description: 'Stripe client secret for frontend' }),
    amount: z.number().openapi({ description: 'Amount in cents' }),
    currency: z.string().openapi({ description: 'Currency code' }),
    creditsToReceive: z.number().openapi({ description: 'Credits that will be granted' }),
    willUpgradeToTier2: z.boolean().openapi({ description: 'Whether this purchase upgrades to tier 2' }),
}).openapi('PaymentIntentResponse');

const PaymentHistoryItemSchema = z.object({
    id: z.string().openapi({ description: 'Payment ID' }),
    amountEur: z.number().openapi({ description: 'Amount in cents' }),
    creditsGranted: z.number().openapi({ description: 'Credits granted' }),
    status: z.enum(['pending', 'completed', 'failed', 'refunded']).openapi({ description: 'Payment status' }),
    createdAt: z.string().openapi({ description: 'Payment date' }),
}).openapi('PaymentHistoryItem');

const PricingInfoSchema = z.object({
    creditsPerEur: z.number().openapi({ description: 'Credits per EUR' }),
    tier2MinPurchase: z.number().openapi({ description: 'Minimum credits for tier 2 upgrade' }),
    tier2MinAmountEur: z.number().openapi({ description: 'Minimum EUR amount for tier 2 (in cents)' }),
    packages: z.array(z.object({
        amountEur: z.number().openapi({ description: 'Amount in cents' }),
        credits: z.number().openapi({ description: 'Credits received' }),
        label: z.string().openapi({ description: 'Display label' }),
        popular: z.boolean().optional().openapi({ description: 'Whether this is a popular option' }),
    })),
}).openapi('PricingInfo');

const ErrorSchema = z.object({
    error: z.string().openapi({ description: 'Error message' }),
}).openapi('PaymentError');

// Route definitions
const createPaymentIntentRoute = createRoute({
    method: 'post',
    path: '/create-intent',
    tags: ['Payments'],
    summary: 'Create payment intent',
    description: 'Create a Stripe payment intent for credit purchase.',
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: PaymentIntentRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Payment intent created successfully',
            content: { 'application/json': { schema: PaymentIntentResponseSchema } },
        },
        400: {
            description: 'Invalid request',
            content: { 'application/json': { schema: ErrorSchema } },
        },
        401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: ErrorSchema } },
        },
    },
});

const getPaymentHistoryRoute = createRoute({
    method: 'get',
    path: '/history',
    tags: ['Payments'],
    summary: 'Get payment history',
    description: 'Get user payment history.',
    security: [{ bearerAuth: [] }],
    request: {
        query: z.object({
            limit: z.string().optional().openapi({ description: 'Number of payments (default 50)' }),
        }),
    },
    responses: {
        200: {
            description: 'Payment history retrieved successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        payments: z.array(PaymentHistoryItemSchema),
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

const getPricingRoute = createRoute({
    method: 'get',
    path: '/pricing',
    tags: ['Payments'],
    summary: 'Get pricing information',
    description: 'Get credit pricing and package information. No authentication required.',
    responses: {
        200: {
            description: 'Pricing information',
            content: { 'application/json': { schema: PricingInfoSchema } },
        },
    },
});

/**
 * Create payments OpenAPI routes with dependency injection
 */
export function createPaymentsOpenApiRoutes(
    paymentService: PaymentService,
    getCurrentUserTier: (userId: string) => Promise<string>
) {
    const app = new OpenAPIHono<HonoEnv>();

    // Pricing is public, no auth needed
    app.openapi(getPricingRoute, async (c) => {
        const packages = [
            { amountEur: 500, credits: 50, label: '50 Credits (5 EUR)' },
            { amountEur: 1000, credits: 100, label: '100 Credits (10 EUR)', popular: true },
            { amountEur: 2500, credits: 250, label: '250 Credits (25 EUR)' },
            { amountEur: 5000, credits: 500, label: '500 Credits (50 EUR)' },
            { amountEur: 10000, credits: 1000, label: '1000 Credits (100 EUR) - Tier 2' },
        ];

        return c.json({
            creditsPerEur: CREDITS_PER_EUR,
            tier2MinPurchase: TIER2_MIN_PURCHASE,
            tier2MinAmountEur: (TIER2_MIN_PURCHASE / CREDITS_PER_EUR) * 100, // 10000 cents = 100 EUR
            packages,
        }, 200);
    });

    // Protected routes
    app.use('/create-intent', authMiddleware);
    app.use('/history', authMiddleware);

    return app
        .openapi(createPaymentIntentRoute, async (c) => {
            try {
                const user = c.get('user');
                const { amountEur } = c.req.valid('json');

                // Calculate credits
                const eurAmount = amountEur / 100;
                const creditsToReceive = Math.floor(eurAmount * CREDITS_PER_EUR);

                // Get current tier
                const currentTier = await getCurrentUserTier(user.id);
                const willUpgradeToTier2 = creditsToReceive >= TIER2_MIN_PURCHASE && currentTier !== 'paid_tier2';

                const intent = await paymentService.createPaymentIntent({
                    userId: user.id,
                    email: user.email,
                    amountEur,
                    tier: currentTier as 'free' | 'paid_tier1' | 'paid_tier2',
                });

                return c.json({
                    clientSecret: intent.clientSecret,
                    amount: intent.amount,
                    currency: intent.currency,
                    creditsToReceive,
                    willUpgradeToTier2,
                }, 200);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to create payment intent';
                return c.json({ error: message }, 400);
            }
        })
        .openapi(getPaymentHistoryRoute, async (c) => {
            try {
                const user = c.get('user');
                const { limit } = c.req.valid('query');
                const payments = await paymentService.getPaymentHistory(
                    user.id,
                    limit ? parseInt(limit) : 50
                );

                return c.json({
                    payments: payments.map((p) => ({
                        id: p.id,
                        amountEur: p.amountEur,
                        creditsGranted: p.creditsGranted,
                        status: p.status,
                        createdAt: p.createdAt.toISOString(),
                    })),
                    count: payments.length,
                }, 200);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to get payment history';
                return c.json({ error: message }, 500);
            }
        });
}
