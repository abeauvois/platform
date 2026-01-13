/**
 * Order Routes with OpenAPI documentation
 * Protected endpoints for order operations - requires user authentication
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { HonoEnv } from '../types';
import type { IExchangeClient } from '@platform/trading-domain';
import { validateOrderValue } from '@platform/trading-domain';
import { authMiddleware } from '../middlewares/auth.middleware';

// Order types enum
const OrderTypeEnum = z.enum([
    'limit',
    'market',
    'stop_loss',
    'stop_loss_limit',
    'take_profit',
    'take_profit_limit',
]);

// OpenAPI schemas
const CreateOrderRequestSchema = z.object({
    symbol: z.string().openapi({ example: 'BTCUSDT', description: 'Trading pair symbol' }),
    side: z.enum(['buy', 'sell']).openapi({ example: 'buy', description: 'Order side' }),
    type: OrderTypeEnum.default('limit').openapi({
        example: 'stop_loss_limit',
        description: 'Order type (limit, market, stop_loss, stop_loss_limit, take_profit, take_profit_limit)',
    }),
    quantity: z.number().positive().openapi({ example: 0.001, description: 'Order quantity in base asset' }),
    price: z.number().positive().optional().openapi({ example: 42000, description: 'Limit price (required for limit order types)' }),
    stopPrice: z.number().positive().optional().openapi({ example: 41000, description: 'Stop/trigger price (required for stop order types)' }),
    timeInForce: z.enum(['GTC', 'IOC', 'FOK']).optional().default('GTC').openapi({
        example: 'GTC',
        description: 'Time in force (GTC=Good Till Cancel, IOC=Immediate Or Cancel, FOK=Fill Or Kill)',
    }),
    isMarginOrder: z.boolean().optional().default(false).openapi({
        example: false,
        description: 'Whether to place order on margin account (default: false = spot)',
    }),
}).refine(
    (data) => {
        // Validate price is provided for limit orders
        const limitTypes = ['limit', 'stop_loss_limit', 'take_profit_limit'];
        if (limitTypes.includes(data.type)) {
            return data.price !== undefined;
        }
        return true;
    },
    { message: 'Price is required for limit order types' }
).refine(
    (data) => {
        // Validate stopPrice is provided for stop orders
        const stopTypes = ['stop_loss', 'stop_loss_limit', 'take_profit', 'take_profit_limit'];
        if (stopTypes.includes(data.type)) {
            return data.stopPrice !== undefined;
        }
        return true;
    },
    { message: 'Stop price is required for stop order types' }
).openapi('CreateOrderRequest');

const OrderResponseSchema = z.object({
    id: z.string().openapi({ example: '12345678', description: 'Order ID' }),
    symbol: z.string().openapi({ example: 'BTCUSDT', description: 'Trading pair symbol' }),
    side: z.enum(['buy', 'sell']).openapi({ example: 'buy', description: 'Order side' }),
    type: OrderTypeEnum.openapi({ example: 'stop_loss_limit', description: 'Order type' }),
    quantity: z.number().openapi({ example: 0.001, description: 'Order quantity' }),
    price: z.number().optional().openapi({ example: 42000, description: 'Limit price' }),
    stopPrice: z.number().optional().openapi({ example: 41000, description: 'Stop/trigger price' }),
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

const UnauthorizedSchema = z.object({
    error: z.string().openapi({ example: 'Unauthorized', description: 'Authentication required' }),
}).openapi('UnauthorizedError');

// Query schemas
const GetOrdersQuerySchema = z.object({
    symbol: z.string().optional().openapi({
        example: 'BTCUSDT',
        description: 'Trading pair symbol (optional - if omitted, returns all open orders)',
    }),
}).openapi('GetOrdersQuery');

const GetOrderHistoryQuerySchema = z.object({
    symbol: z.string().openapi({
        example: 'BTCUSDT',
        description: 'Trading pair symbol (required)',
    }),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50).openapi({
        example: 50,
        description: 'Maximum number of orders to return (default: 50, max: 100)',
    }),
}).openapi('GetOrderHistoryQuery');

const OrdersListResponseSchema = z.array(OrderResponseSchema).openapi('OrdersListResponse');

// Route definitions
const getOrdersRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Orders'],
    summary: 'Get open orders',
    description: 'Get all open orders for a symbol, or all open orders if no symbol specified. Requires authentication.',
    security: [{ session: [] }],
    request: {
        query: GetOrdersQuerySchema,
    },
    responses: {
        200: {
            description: 'List of open orders',
            content: {
                'application/json': {
                    schema: OrdersListResponseSchema,
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

const getOrderHistoryRoute = createRoute({
    method: 'get',
    path: '/history',
    tags: ['Orders'],
    summary: 'Get order history',
    description: 'Get filled orders for a symbol. Returns up to the specified limit of most recent filled orders. Requires authentication.',
    security: [{ session: [] }],
    request: {
        query: GetOrderHistoryQuerySchema,
    },
    responses: {
        200: {
            description: 'List of filled orders',
            content: {
                'application/json': {
                    schema: OrdersListResponseSchema,
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

const createOrderRoute = createRoute({
    method: 'post',
    path: '/',
    tags: ['Orders'],
    summary: 'Create a new order',
    description: 'Create a new limit or market order. Validates order value against safety limits. Requires authentication.',
    security: [{ session: [] }],
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

/**
 * Create order OpenAPI routes with dependency injection
 * @param exchangeClient - Authenticated exchange client instance (injected)
 * @returns OpenAPIHono app with order routes (protected by auth middleware applied at registration)
 */
export function createOrderOpenApiRoutes(exchangeClient: IExchangeClient) {
    const app = new OpenAPIHono<HonoEnv>();

    // Require user authentication for all order routes
    app.use('/*', authMiddleware);

    return app.openapi(getOrdersRoute, async (c) => {
            try {
                const { symbol } = c.req.valid('query');

                // Fetch open orders from exchange
                const orders = await exchangeClient.getOrders(symbol);

                return c.json(orders.map((order) => ({
                    id: order.id,
                    symbol: order.symbol,
                    side: order.side,
                    type: order.type,
                    quantity: order.quantity,
                    price: order.price,
                    stopPrice: order.stopPrice,
                    status: order.status,
                    filledQuantity: order.filledQuantity,
                    createdAt: order.createdAt.toISOString(),
                    updatedAt: order.updatedAt.toISOString(),
                })), 200);
            } catch (error) {
                console.error('Failed to fetch orders:', error);
                const message = error instanceof Error ? error.message : 'Failed to fetch orders';
                return c.json({ error: message }, 500);
            }
        })
        .openapi(createOrderRoute, async (c) => {
            try {
                const data = c.req.valid('json');

                // Determine price for validation (use stopPrice for market stop orders, price for limit orders)
                const priceForValidation = data.price ?? data.stopPrice ?? 0;

                // Validate order value (max $500 limit)
                const validation = validateOrderValue(data.quantity, priceForValidation);
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
                    stopPrice: data.stopPrice,
                    timeInForce: data.timeInForce,
                    isMarginOrder: data.isMarginOrder,
                });

                return c.json({
                    id: order.id,
                    symbol: order.symbol,
                    side: order.side,
                    type: order.type,
                    quantity: order.quantity,
                    price: order.price,
                    stopPrice: order.stopPrice,
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
        })
        .openapi(getOrderHistoryRoute, async (c) => {
            try {
                const { symbol, limit } = c.req.valid('query');

                // Fetch order history from exchange
                const orders = await exchangeClient.getOrderHistory(symbol, limit);

                return c.json(orders.map((order) => ({
                    id: order.id,
                    symbol: order.symbol,
                    side: order.side,
                    type: order.type,
                    quantity: order.quantity,
                    price: order.price,
                    stopPrice: order.stopPrice,
                    status: order.status,
                    filledQuantity: order.filledQuantity,
                    createdAt: order.createdAt.toISOString(),
                    updatedAt: order.updatedAt.toISOString(),
                })), 200);
            } catch (error) {
                console.error('Failed to fetch order history:', error);
                const message = error instanceof Error ? error.message : 'Failed to fetch order history';
                return c.json({ error: message }, 500);
            }
        });
}
