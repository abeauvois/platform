import {
    pgTable,
    timestamp,
    uuid,
    varchar,
    text,
    integer,
    jsonb,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

/**
 * Bookmarks table
 * Stores user bookmarks with metadata and analysis results
 */
export const bookmarks = pgTable('bookmarks', {
    id: varchar('id', { length: 100 }).primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    sourceAdapter: varchar('source_adapter', { length: 50 }).notNull().default('None'),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    summary: text('summary').notNull().default(''),
    rawContent: text('raw_content').notNull().default(''),
    contentType: varchar('content_type', { length: 50 }).notNull().default('unknown'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Background tasks table
 * Used for tracking background workflows
 */
export const backgroundTasks = pgTable('background_tasks', {
    id: varchar('id', { length: 100 }).primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    preset: varchar('preset', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    progress: integer('progress').notNull().default(0),
    message: varchar('message', { length: 500 }).notNull().default('Job created'),
    /** Current step being executed */
    currentStep: varchar('current_step', { length: 50 }),
    /** Item progress within current step (JSON: { current: number, total: number }) */
    itemProgress: jsonb('item_progress'),
    result: jsonb('result'),
    pgBossJobId: uuid('pg_boss_job_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
