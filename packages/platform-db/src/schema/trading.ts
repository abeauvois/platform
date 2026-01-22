import {
    pgTable,
    timestamp,
    varchar,
    text,
    unique,
    index,
    bigint,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

/**
 * User trading settings table
 * Stores user preferences for trading (e.g., default account mode)
 */
export const userTradingSettings = pgTable('user_trading_settings', {
    userId: text('user_id')
        .primaryKey()
        .references(() => user.id, { onDelete: 'cascade' }),
    defaultAccountMode: varchar('default_account_mode', { length: 10 })
        .notNull()
        .default('spot'), // 'spot' | 'margin'
    /** Global reference timestamp for watchlist price variation (Unix ms) */
    globalReferenceTimestamp: bigint('global_reference_timestamp', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Watchlist table
 * Stores user watchlist symbols for the trading app
 */
export const watchlist = pgTable('watchlist', {
    id: varchar('id', { length: 100 }).primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** Reference timestamp for price variation calculation (Unix ms) */
    referenceTimestamp: bigint('reference_timestamp', { mode: 'number' }),
}, (table) => [
    // Prevent duplicate symbols per user
    unique('watchlist_user_symbol_unique').on(table.userId, table.symbol),
    // Index for fast lookup by userId
    index('watchlist_user_id_idx').on(table.userId),
]);
