import {
    pgTable,
    timestamp,
    varchar,
    text,
    jsonb,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

/**
 * User settings table
 * Stores unified user preferences for all platform apps
 *
 * Architecture:
 * - Typed platform settings (theme, locale) as columns for validation
 * - Flexible namespaced preferences in JSONB for extensibility
 *
 * Namespace convention: `{scope}:{name}` where scope is app, domain, or feature
 * Example preferences structure:
 * {
 *   "app:dashboard": { "sidebarCollapsed": true, "defaultView": "grid" },
 *   "domain:trading": { "defaultExchange": "binance", "riskLevel": "moderate" }
 * }
 */
export const userSettings = pgTable('user_settings', {
    userId: text('user_id')
        .primaryKey()
        .references(() => user.id, { onDelete: 'cascade' }),
    // Platform settings (typed columns)
    theme: varchar('theme', { length: 10 }).notNull().default('system'), // 'light' | 'dark' | 'system'
    locale: varchar('locale', { length: 10 }).notNull().default('en'),
    // Flexible namespaced preferences (apps, domains, features)
    preferences: jsonb('preferences').$type<Record<string, Record<string, unknown>>>().default({}),
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
