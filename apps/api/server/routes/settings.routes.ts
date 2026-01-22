import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { DrizzleUserSettingsRepository } from '../infrastructure/DrizzleUserSettingsRepository';
import type { HonoEnv } from '../types';
import { authMiddleware } from '@/middlewares/auth.middleware';

const repository = new DrizzleUserSettingsRepository();

// Validation schema for updating settings
const updateSettingsSchema = z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    locale: z.string().max(10).optional(),
    tradingAccountMode: z.enum(['spot', 'margin']).optional(),
    tradingReferenceTimestamp: z.number().nullable().optional(),
});

const updateSettingsValidator = zValidator('json', updateSettingsSchema, (result, c) => {
    if (!result.success) {
        return c.json(
            {
                error: 'Invalid settings data',
                errors: result.error.issues.map((issue) => issue.message),
            },
            400
        );
    }
});

export const settings = new Hono<HonoEnv>()
    .use(authMiddleware)

    // GET /api/settings - fetch user settings
    .get('/', async (c) => {
        const user = c.get('user');

        try {
            let userSettings = await repository.findByUserId(user.id);

            // If no settings exist, create default settings
            if (!userSettings) {
                userSettings = await repository.upsert(user.id, {});
            }

            return c.json(userSettings);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            return c.json({ error: 'Failed to fetch settings' }, 500);
        }
    })

    // PUT /api/settings - update user settings (partial updates)
    .put('/', updateSettingsValidator, async (c) => {
        const user = c.get('user');
        const updates = c.req.valid('json');

        try {
            const userSettings = await repository.upsert(user.id, updates);
            return c.json(userSettings);
        } catch (error) {
            console.error('Failed to update settings:', error);
            return c.json({ error: 'Failed to update settings' }, 500);
        }
    });
