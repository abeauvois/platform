// Validate environment variables first - fail fast if misconfigured
import { env } from './env';

import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { CreditService, PaymentService } from '@abeauvois/platform-gamification-domain';
import { createCreditsOpenApiRoutes } from './routes/credits.openapi.routes';
import { createPaymentsOpenApiRoutes } from './routes/payments.openapi.routes';
import { createWebhookRoutes } from './routes/webhooks.routes';
import { DrizzleCreditRepository } from './infrastructure/DrizzleCreditRepository';
import { DrizzlePaymentRepository } from './infrastructure/DrizzlePaymentRepository';
import { TimestampIdGenerator } from './infrastructure/TimestampIdGenerator';
import { StripePaymentGateway } from './adapters/StripePaymentGateway';

// Create infrastructure instances (dependency injection at composition root)
const creditRepository = new DrizzleCreditRepository();
const paymentRepository = new DrizzlePaymentRepository();
const idGenerator = new TimestampIdGenerator();
const paymentGateway = new StripePaymentGateway(env.STRIPE_SECRET_KEY);

// Create domain services with injected dependencies
const creditService = new CreditService(creditRepository);
const paymentService = new PaymentService(
    paymentRepository,
    paymentGateway,
    idGenerator,
    creditRepository
);

// Helper to get current user tier
const getCurrentUserTier = async (userId: string): Promise<string> => {
    const balance = await creditService.getBalance(userId);
    return balance.tier;
};

const app = new OpenAPIHono();

// Environment-based URL configuration for CORS and OpenAPI
const GAMIFICATION_API_URL = env.GAMIFICATION_API_URL;
const API_URL = env.API_URL;
const TRADING_SERVER_URL = env.TRADING_SERVER_URL;
const CLIENT_URL = env.CLIENT_URL;
const TRADING_CLIENT_URL = env.TRADING_CLIENT_URL;

// Middleware
app.use(logger());
app.use(
    '/*',
    cors({
        origin: (origin) => {
            const allowedOrigins = [
                CLIENT_URL,
                TRADING_CLIENT_URL,
                API_URL,
                TRADING_SERVER_URL,
                ...(env.CLIENT_URLS ? env.CLIENT_URLS.split(',').filter(Boolean) : []),
            ];
            if (allowedOrigins.includes(origin)) {
                return origin;
            }
            return null;
        },
        credentials: true,
    })
);

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Gamification API routes with OpenAPI documentation
app.route('/api/gamification/credits', createCreditsOpenApiRoutes(creditService));
app.route('/api/gamification/payments', createPaymentsOpenApiRoutes(paymentService, getCurrentUserTier));

// Webhook routes (no OpenAPI docs, separate from main API)
app.route('/api/webhooks', createWebhookRoutes(
    paymentService,
    env.STRIPE_SECRET_KEY,
    env.STRIPE_WEBHOOK_SECRET
));

// OpenAPI JSON spec endpoint
app.doc('/api/docs/openapi.json', {
    openapi: '3.0.0',
    info: {
        title: 'Gamification API',
        version: '1.0.0',
        description: `Credits and gamification API for the platform. Handles user credits, payments, and access control. For authentication, see the Platform API at ${API_URL}.`,
    },
    servers: [
        {
            url: GAMIFICATION_API_URL,
            description: 'Gamification API (Development)',
        },
    ],
    tags: [
        {
            name: 'Credits',
            description: 'Credit balance and transaction endpoints - requires user authentication',
        },
        {
            name: 'Payments',
            description: 'Payment and credit purchase endpoints',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                description: 'Session-based authentication. Include session cookie or bearer token.',
            },
        },
    },
});

// Scalar API Reference UI
app.get(
    '/api/docs',
    Scalar({
        theme: 'purple',
        url: '/api/docs/openapi.json',
        pageTitle: 'Gamification API Documentation',
    })
);

// Start server
const port = parseInt(env.PORT);
console.log(`Gamification API starting on port ${port}...`);

export type AppType = typeof app;
export default app;
