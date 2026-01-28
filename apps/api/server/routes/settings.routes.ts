import { Hono } from 'hono';
import { DrizzleUserSettingsRepository } from '../infrastructure/DrizzleUserSettingsRepository';
import type { HonoEnv } from '../types';
import { authMiddleware } from '@/middlewares/auth.middleware';
import type { SettingsNamespace } from '@abeauvois/platform-core';
import {
    platformSettingsValidator,
    updateSettingsValidator,
    namespaceDataValidator,
    validateNamespace,
} from '../validators/settings.validator';

const repository = new DrizzleUserSettingsRepository();

export const settings = new Hono<HonoEnv>()
    .use(authMiddleware)

    // GET /api/settings - fetch full user settings
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

    // PATCH /api/settings - update user settings (platform + namespaces)
    .patch('/', updateSettingsValidator, async (c) => {
        const user = c.get('user');
        const updates = c.req.valid('json');

        try {
            const userSettings = await repository.upsert(user.id, updates);
            return c.json(userSettings);
        } catch (error) {
            console.error('Failed to update settings:', error);
            return c.json({ error: 'Failed to update settings' }, 500);
        }
    })

    // PUT /api/settings - legacy endpoint for backwards compatibility
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
    })

    // GET /api/settings/platform - fetch platform settings only
    .get('/platform', async (c) => {
        const user = c.get('user');

        try {
            let userSettings = await repository.findByUserId(user.id);

            if (!userSettings) {
                userSettings = await repository.upsert(user.id, {});
            }

            return c.json(userSettings.platform);
        } catch (error) {
            console.error('Failed to fetch platform settings:', error);
            return c.json({ error: 'Failed to fetch platform settings' }, 500);
        }
    })

    // PATCH /api/settings/platform - update platform settings
    .patch('/platform', platformSettingsValidator, async (c) => {
        const user = c.get('user');
        const updates = c.req.valid('json');

        try {
            const userSettings = await repository.updatePlatform(user.id, updates);
            return c.json(userSettings.platform);
        } catch (error) {
            console.error('Failed to update platform settings:', error);
            return c.json({ error: 'Failed to update platform settings' }, 500);
        }
    })

    // GET /api/settings/namespace/:ns - fetch namespace settings
    .get('/namespace/:ns', async (c) => {
        const user = c.get('user');
        const ns = c.req.param('ns');

        const validation = validateNamespace(ns);
        if (!validation.valid) {
            return c.json({ error: validation.error }, 400);
        }

        try {
            const namespaceData = await repository.getNamespace(user.id, ns as SettingsNamespace);
            return c.json(namespaceData);
        } catch (error) {
            console.error(`Failed to fetch namespace ${ns}:`, error);
            return c.json({ error: 'Failed to fetch namespace settings' }, 500);
        }
    })

    // PATCH /api/settings/namespace/:ns - update namespace settings (deep merge)
    .patch('/namespace/:ns', namespaceDataValidator, async (c) => {
        const user = c.get('user');
        const ns = c.req.param('ns');
        const data = c.req.valid('json');

        const validation = validateNamespace(ns);
        if (!validation.valid) {
            return c.json({ error: validation.error }, 400);
        }

        try {
            const userSettings = await repository.updateNamespace(user.id, ns as SettingsNamespace, data);
            return c.json(userSettings.preferences[ns as SettingsNamespace] ?? {});
        } catch (error) {
            console.error(`Failed to update namespace ${ns}:`, error);
            return c.json({ error: 'Failed to update namespace settings' }, 500);
        }
    })

    // DELETE /api/settings/namespace/:ns - reset namespace to empty
    .delete('/namespace/:ns', async (c) => {
        const user = c.get('user');
        const ns = c.req.param('ns');

        const validation = validateNamespace(ns);
        if (!validation.valid) {
            return c.json({ error: validation.error }, 400);
        }

        try {
            await repository.resetNamespace(user.id, ns as SettingsNamespace);
            return c.json({ success: true, message: `Namespace ${ns} has been reset` });
        } catch (error) {
            console.error(`Failed to reset namespace ${ns}:`, error);
            return c.json({ error: 'Failed to reset namespace settings' }, 500);
        }
    });
