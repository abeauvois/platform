/**
 * Order Routes with OpenAPI documentation
 * Protected endpoints for order operations
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { HonoEnv } from '../types';
import type { IExchangeClient } from '@platform/trading-domain';
import { validateOrderValue } from '@platform/trading-domain';

// OpenAPI schemas
const CreateOrderRequestSchema = z.object({
    symbol: z.string().openapi({ example: 'BTCUSDT', description: 'Trading pair symbol' }),
    side: z.enum(['buy', 'sell']).openapi({ example: 'buy', description: 'Order side' }),
    type: z.enum(['limit', 'market']).default('limit').openapi({ example: 'limit', description: 'Order type' }),
    quantity: z.number().positive().openapi({ example: 0.001, description: 'Order quantity in base asset' }),
    price: z.number().positive().openapi({ example: 42000, description: 'Limit price' }),
    timeInForce: z.enum(['GTC', 'IOC', 'FOK']).optional().default('GTC').openapi({
        example: 'GTC',
        description: 'Time in force (GTC=Good Till Cancel, IOC=Immediate Or Cancel, FOK=Fill Or Kill)',
    }),
}).openapi('CreateOrderRequest');

const OrderResponseSchema = z.object({
    id: z.string().openapi({ example: '12345678', description: 'Order ID' }),
    symbol: z.string().openapi({ example: 'BTCUSDT', description: 'Trading pair symbol' }),
    side: z.enum(['buy', 'sell']).openapi({ example: 'buy', description: 'Order side' }),
    type: z.enum(['market', 'limit', 'stop', 'stop_limit']).openapi({ example: 'limit', description: 'Order type' }),
    quantity: z.number().openapi({ example: 0.001, description: 'Order quantity' }),
    price: z.number().optional().openapi({ example: 42000, description: 'Limit price' }),
    status: z.enum(['pending', 'filled', 'partially_filled', 'cancelled', 'rejected']).openapi({
        example: 'pending',
        description: 'Order status',
    }),
    filledQuantity: z.number().openapi({ example: 0, description: 'Filled quantity' }),
    createdAt: z.string().openapi({ example: '2024-01-01T00:00:00.000Z', description: 'Order creation timestamp' }),
    updatedAt: z.string().openapi({ example: '2024-01-01T00:00:00.000Z', description: 'Last update timestamp' }),
}).openapi('OrderResponse');

const ErrorSchema = z.object({
    error: z.string().openapi({ example: 'Order creation failed', description: 'Error message' }),
}).openapi('OrderError');

// Route definitions
const createOrderRoute = createRoute({
    method: 'post',
    path: '/',
    tags: ['Orders'],
    summary: 'Create a new order',
    description: 'Create a new limit or market order. Validates order value against safety limits.',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateOrderRequestSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'Order created successfully',
            content: {
                'application/json': {
                    schema: OrderResponseSchema,
                },
            },
        },
        400: {
            description: 'Invalid request or order validation failed',
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
 * Create order OpenAPI routes with dependency injection
 * @param exchangeClient - Authenticated exchange client instance (injected)
 * @returns OpenAPIHono app with order routes
 */
export function createOrderOpenApiRoutes(exchangeClient: IExchangeClient) {
    return new OpenAPIHono<HonoEnv>()
        .openapi(createOrderRoute, async (c) => {
            try {
                const data = c.req.valid('json');

                // Validate order value (max $500 limit)
                const validation = validateOrderValue(data.quantity, data.price);
                if (!validation.valid) {
                    return c.json({ error: validation.error }, 400);
                }

                // Create the order via exchange client
                const order = await exchangeClient.createOrder({
                    symbol: data.symbol,
                    side: data.side,
                    type: data.type,
                    quantity: data.quantity,
                    price: data.price,
                    timeInForce: data.timeInForce,
                });

                return c.json({
                    id: order.id,
                    symbol: order.symbol,
                    side: order.side,
                    type: order.type,
                    quantity: order.quantity,
                    price: order.price,
                    status: order.status,
                    filledQuantity: order.filledQuantity,
                    createdAt: order.createdAt.toISOString(),
                    updatedAt: order.updatedAt.toISOString(),
                }, 201);
            } catch (error) {
                console.error('Failed to create order:', error);
                const message = error instanceof Error ? error.message : 'Order creation failed';
                return c.json({ error: message }, 500);
            }
        });
}
