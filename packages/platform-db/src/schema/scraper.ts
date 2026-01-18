import {
    pgTable,
    timestamp,
    varchar,
    text,
    jsonb,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

/**
 * Scraped data table
 * Stores results from browser scraping operations
 */
export const scrapedData = pgTable('scraped_data', {
    id: varchar('id', { length: 100 }).primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    source: varchar('source', { length: 50 }).notNull(),  // 'leboncoin', etc.
    sourceUrl: text('source_url').notNull(),
    strategyName: varchar('strategy_name', { length: 50 }).notNull(),
    data: jsonb('data').notNull(),  // Scraped content (listings, etc.)
    itemCount: varchar('item_count', { length: 20 }),  // Number of items scraped
    scrapedAt: timestamp('scraped_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Type for inserting scraped data
 */
export type InsertScrapedData = typeof scrapedData.$inferInsert;

/**
 * Type for selecting scraped data
 */
export type SelectScrapedData = typeof scrapedData.$inferSelect;
