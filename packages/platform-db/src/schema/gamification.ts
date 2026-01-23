import {
    pgTable,
    timestamp,
    varchar,
    text,
    integer,
    jsonb,
    unique,
    index,
    date,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

/**
 * User credit balance table
 * Tracks user's credit balance, tier, and activity
 */
export const userCreditBalance = pgTable('user_credit_balance', {
    userId: text('user_id')
        .primaryKey()
        .references(() => user.id, { onDelete: 'cascade' }),
    balance: integer('balance').notNull().default(50), // Free credits
    lifetimeSpent: integer('lifetime_spent').notNull().default(0),
    tier: varchar('tier', { length: 20 }).notNull().default('free'),
    lastActivityDate: date('last_activity_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Credit transactions table (ledger)
 * Records all credit movements for auditing
 */
export const creditTransactions = pgTable('credit_transactions', {
    id: varchar('id', { length: 100 }).primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 30 }).notNull(), // daily_active, trade, purchase, refund, bonus
    amount: integer('amount').notNull(), // Positive for additions, negative for deductions
    balanceAfter: integer('balance_after').notNull(),
    referenceId: varchar('reference_id', { length: 100 }),
    referenceType: varchar('reference_type', { length: 30 }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index('credit_transactions_user_id_idx').on(table.userId),
    index('credit_transactions_created_at_idx').on(table.createdAt),
    index('credit_transactions_reference_idx').on(table.referenceId, table.referenceType),
]);

/**
 * Payments table
 * Records payment transactions with Stripe
 */
export const payments = pgTable('payments', {
    id: varchar('id', { length: 100 }).primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 100 }).notNull(),
    amountEur: integer('amount_eur').notNull(), // Amount in cents
    creditsGranted: integer('credits_granted').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, completed, failed, refunded
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index('payments_user_id_idx').on(table.userId),
    index('payments_stripe_intent_idx').on(table.stripePaymentIntentId),
]);

/**
 * User daily activity table
 * Tracks first daily activity for charging purposes
 */
export const userDailyActivity = pgTable('user_daily_activity', {
    id: varchar('id', { length: 100 }).primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    activityDate: date('activity_date').notNull(),
    chargedAt: timestamp('charged_at', { withTimezone: true }).notNull().defaultNow(),
    activityType: varchar('activity_type', { length: 30 }).notNull().default('api_call'),
}, (table) => [
    unique('user_daily_activity_user_date_unique').on(table.userId, table.activityDate),
    index('user_daily_activity_user_id_idx').on(table.userId),
]);
