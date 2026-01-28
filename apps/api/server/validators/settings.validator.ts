import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

/**
 * Theme enum values
 */
export const THEMES = ['light', 'dark', 'system'] as const;

/**
 * Namespace pattern: must match {scope}:{name} format
 * where scope is app, domain, or feature
 */
const namespacePattern = /^(app|domain|feature):[a-z][a-z0-9-]*$/;

/**
 * Schema for platform settings (theme, locale)
 */
export const platformSettingsSchema = z.object({
    theme: z.enum(THEMES).optional(),
    locale: z.string().min(2).max(10).optional(),
});

export type PlatformSettingsInput = z.infer<typeof platformSettingsSchema>;

/**
 * Schema for full settings update (platform + namespaces)
 */
export const updateSettingsSchema = z.object({
    platform: platformSettingsSchema.optional(),
    preferences: z.record(
        z.string().regex(namespacePattern, 'Invalid namespace format. Expected: app:name, domain:name, or feature:name'),
        z.record(z.string(), z.unknown())
    ).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

/**
 * Schema for namespace data (any object)
 */
export const namespaceDataSchema = z.record(z.string(), z.unknown());

export type NamespaceDataInput = z.infer<typeof namespaceDataSchema>;

/**
 * Validator for platform settings updates
 */
export const platformSettingsValidator = zValidator('json', platformSettingsSchema, (result, c) => {
    if (!result.success) {
        return c.json(
            {
                error: 'Invalid platform settings',
                details: result.error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                })),
            },
            400
        );
    }
});

/**
 * Validator for full settings updates
 */
export const updateSettingsValidator = zValidator('json', updateSettingsSchema, (result, c) => {
    if (!result.success) {
        return c.json(
            {
                error: 'Invalid settings data',
                details: result.error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                })),
            },
            400
        );
    }
});

/**
 * Validator for namespace data
 */
export const namespaceDataValidator = zValidator('json', namespaceDataSchema, (result, c) => {
    if (!result.success) {
        return c.json(
            {
                error: 'Invalid namespace data',
                details: result.error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                })),
            },
            400
        );
    }
});

/**
 * Validate namespace parameter from URL
 */
export function validateNamespace(namespace: string): { valid: true; namespace: string } | { valid: false; error: string } {
    if (!namespacePattern.test(namespace)) {
        return {
            valid: false,
            error: 'Invalid namespace format. Expected: app:name, domain:name, or feature:name',
        };
    }
    return { valid: true, namespace };
}
