import {
    pgTable,
    timestamp,
    varchar,
    text,
    bigint,
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
    // Trading settings (migrated from user_trading_settings)
    tradingAccountMode: varchar('trading_account_mode', { length: 10 }).default('spot'), // 'spot' | 'margin'
    /** Global reference timestamp for watchlist price variation (Unix ms) */
    tradingReferenceTimestamp: bigint('trading_reference_timestamp', { mode: 'number' }),
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
