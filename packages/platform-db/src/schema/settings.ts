import {
    pgTable,
    timestamp,
    varchar,
    text,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

/**
 * User settings table
 * Stores unified user preferences for all platform apps
 */
export const userSettings = pgTable('user_settings', {
    userId: text('user_id')
        .primaryKey()
        .references(() => user.id, { onDelete: 'cascade' }),
    // Platform settings
    theme: varchar('theme', { length: 10 }).notNull().default('system'), // 'light' | 'dark' | 'system'
    locale: varchar('locale', { length: 10 }).notNull().default('en'),
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
