import {
    pgTable,
    timestamp,
    boolean,
    uuid,
    varchar,
    text,
    integer,
    jsonb,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

// Shared application tables
// These tables are used across multiple apps in the monorepo

export const todos = pgTable('todos', {
    id: uuid().primaryKey().defaultRandom(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    title: varchar({ length: 500 }).notNull(),
    subtitle: varchar({ length: 500 }),
    description: varchar({ length: 1000 }),
    completed: boolean().default(false),
    createdAt: timestamp({ withTimezone: true }).defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow(),
});

/**
 * Ingest job status tracking table
 * Used for tracking background ingestion workflows
 */
export const ingestJobs = pgTable('ingest_jobs', {
    id: varchar('id', { length: 100 }).primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    preset: varchar('preset', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    progress: integer('progress').notNull().default(0),
    message: varchar('message', { length: 500 }).notNull().default('Job created'),
    result: jsonb('result'),
    pgBossJobId: uuid('pg_boss_job_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
