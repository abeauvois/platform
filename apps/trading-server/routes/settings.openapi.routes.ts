/**
 * User Trading Settings Routes with OpenAPI documentation
 * Protected endpoints for user settings operations - requires user authentication
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { HonoEnv } from '../types';
import type { IUserSettingsRepository } from '@platform/trading-domain';
import { authMiddleware } from '../middlewares/auth.middleware';

// OpenAPI schemas
const AccountModeSchema = z.enum(['spot', 'margin']).openapi({
    example: 'spot',
    description: 'Account mode for trading orders',
});

const UserTradingSettingsSchema = z.object({
    defaultAccountMode: AccountModeSchema,
    createdAt: z.string().datetime().openapi({
        example: '2024-01-15T12:00:00.000Z',
        description: 'When settings were created',
    }),
    updatedAt: z.string().datetime().openapi({
        example: '2024-01-15T12:00:00.000Z',
        description: 'When settings were last updated',
    }),
}).openapi('UserTradingSettings');

const UpdateSettingsRequestSchema = z.object({
    defaultAccountMode: AccountModeSchema.optional().openapi({
        example: 'margin',
        description: 'Default account mode for new orders',
    }),
}).openapi('UpdateSettingsRequest');

const ErrorSchema = z.object({
    error: z.string().openapi({ example: 'Failed to update settings', description: 'Error message' }),
}).openapi('SettingsError');

const UnauthorizedSchema = z.object({
    error: z.string().openapi({ example: 'Unauthorized', description: 'Authentication required' }),
}).openapi('UnauthorizedError');

// Route definitions
const getSettingsRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Settings'],
    summary: 'Get user trading settings',
    description: 'Fetch user trading settings. Returns defaults if no settings exist. Requires authentication.',
    security: [{ session: [] }],
    responses: {
        200: {
            description: 'User trading settings',
            content: {
                'application/json': {
                    schema: UserTradingSettingsSchema,
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

const updateSettingsRoute = createRoute({
    method: 'put',
    path: '/',
    tags: ['Settings'],
    summary: 'Update user trading settings',
    description: 'Update user trading settings. Creates settings if they do not exist. Requires authentication.',
    security: [{ session: [] }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateSettingsRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Settings updated successfully',
            content: {
                'application/json': {
                    schema: UserTradingSettingsSchema,
                },
            },
        },
        400: {
            description: 'Invalid request',
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
 * Create settings OpenAPI routes with dependency injection
 * @param settingsRepo - User settings repository instance (injected)
 * @returns OpenAPIHono app with settings routes
 */
export function createSettingsOpenApiRoutes(settingsRepo: IUserSettingsRepository) {
    const app = new OpenAPIHono<HonoEnv>();

    // Require user authentication for all settings routes
    app.use('/*', authMiddleware);

    return app
        .openapi(getSettingsRoute, async (c) => {
            try {
                const user = c.get('user');
                const settings = await settingsRepo.findByUserId(user.id);

                if (!settings) {
                    // Return defaults if no settings exist
                    const now = new Date().toISOString();
                    return c.json({
                        defaultAccountMode: 'spot' as const,
                        createdAt: now,
                        updatedAt: now,
                    }, 200);
                }

                return c.json({
                    defaultAccountMode: settings.defaultAccountMode,
                    createdAt: settings.createdAt.toISOString(),
                    updatedAt: settings.updatedAt.toISOString(),
                }, 200);
            } catch (error) {
                console.error('Failed to fetch settings:', error);
                const message = error instanceof Error ? error.message : 'Failed to fetch settings';
                return c.json({ error: message }, 500);
            }
        })
        .openapi(updateSettingsRoute, async (c) => {
            try {
                const user = c.get('user');
                const data = c.req.valid('json');

                const settings = await settingsRepo.upsert(user.id, data);

                return c.json({
                    defaultAccountMode: settings.defaultAccountMode,
                    createdAt: settings.createdAt.toISOString(),
                    updatedAt: settings.updatedAt.toISOString(),
                }, 200);
            } catch (error) {
                console.error('Failed to update settings:', error);
                const message = error instanceof Error ? error.message : 'Failed to update settings';
                return c.json({ error: message }, 500);
            }
        });
}
