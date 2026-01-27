/**
 * Drizzle Credit Repository
 * Database implementation of ICreditRepository
 */

import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '@abeauvois/platform-db';
import {
    userCreditBalance,
    creditTransactions,
    userDailyActivity,
} from '@abeauvois/platform-db/schema';
import type {
    ICreditRepository,
} from '@abeauvois/platform-gamification-domain';
import type {
    CreditBalance,
    CreditTransaction,
    CreditTransactionType,
    UserTier,
} from '@abeauvois/platform-gamification-domain';
import { FREE_CREDITS } from '@abeauvois/platform-gamification-domain';
import { TimestampIdGenerator } from './TimestampIdGenerator';

const idGenerator = new TimestampIdGenerator();

export class DrizzleCreditRepository implements ICreditRepository {
    async getBalance(userId: string): Promise<CreditBalance | null> {
        const result = await db
            .select()
            .from(userCreditBalance)
            .where(eq(userCreditBalance.userId, userId))
            .limit(1);

        if (result.length === 0) {
            return null;
        }

        const row = result[0];
        return {
            userId: row.userId,
            balance: row.balance,
            lifetimeSpent: row.lifetimeSpent,
            tier: row.tier as UserTier,
            lastActivityDate: row.lastActivityDate,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    async initializeBalance(userId: string): Promise<CreditBalance> {
        const now = new Date();
        const newBalance = {
            userId,
            balance: FREE_CREDITS,
            lifetimeSpent: 0,
            tier: 'free' as const,
            lastActivityDate: null,
            createdAt: now,
            updatedAt: now,
        };

        await db.insert(userCreditBalance).values(newBalance);

        return newBalance;
    }

    async deductCredits(
        userId: string,
        amount: number,
        type: CreditTransactionType,
        referenceId?: string,
        referenceType?: string,
        metadata?: Record<string, unknown>
    ): Promise<CreditTransaction> {
        // Get current balance
        const balance = await this.getBalance(userId);
        if (!balance) {
            throw new Error(`User ${userId} has no credit balance`);
        }

        const newBalance = balance.balance - amount;
        const now = new Date();
        const transactionId = idGenerator.generate('tx');

        // Update balance and lifetime spent atomically
        await db.transaction(async (tx) => {
            // Update user balance
            await tx
                .update(userCreditBalance)
                .set({
                    balance: newBalance,
                    lifetimeSpent: balance.lifetimeSpent + amount,
                    updatedAt: now,
                })
                .where(eq(userCreditBalance.userId, userId));

            // Create transaction record
            await tx.insert(creditTransactions).values({
                id: transactionId,
                userId,
                type,
                amount: -amount, // Negative for deductions
                balanceAfter: newBalance,
                referenceId: referenceId ?? null,
                referenceType: referenceType ?? null,
                metadata: metadata ?? null,
                createdAt: now,
            });
        });

        return {
            id: transactionId,
            userId,
            type,
            amount: -amount,
            balanceAfter: newBalance,
            referenceId: referenceId ?? null,
            referenceType: referenceType ?? null,
            metadata: metadata ?? null,
            createdAt: now,
        };
    }

    async addCredits(
        userId: string,
        amount: number,
        type: CreditTransactionType,
        referenceId?: string,
        referenceType?: string,
        metadata?: Record<string, unknown>
    ): Promise<CreditTransaction> {
        // Get current balance
        const balance = await this.getBalance(userId);
        if (!balance) {
            throw new Error(`User ${userId} has no credit balance`);
        }

        const newBalance = balance.balance + amount;
        const now = new Date();
        const transactionId = idGenerator.generate('tx');

        await db.transaction(async (tx) => {
            // Update user balance
            await tx
                .update(userCreditBalance)
                .set({
                    balance: newBalance,
                    updatedAt: now,
                })
                .where(eq(userCreditBalance.userId, userId));

            // Create transaction record
            await tx.insert(creditTransactions).values({
                id: transactionId,
                userId,
                type,
                amount, // Positive for additions
                balanceAfter: newBalance,
                referenceId: referenceId ?? null,
                referenceType: referenceType ?? null,
                metadata: metadata ?? null,
                createdAt: now,
            });
        });

        return {
            id: transactionId,
            userId,
            type,
            amount,
            balanceAfter: newBalance,
            referenceId: referenceId ?? null,
            referenceType: referenceType ?? null,
            metadata: metadata ?? null,
            createdAt: now,
        };
    }

    async getTransactions(
        userId: string,
        limit = 50,
        offset = 0
    ): Promise<Array<CreditTransaction>> {
        const result = await db
            .select()
            .from(creditTransactions)
            .where(eq(creditTransactions.userId, userId))
            .orderBy(desc(creditTransactions.createdAt))
            .limit(limit)
            .offset(offset);

        return result.map((row) => ({
            id: row.id,
            userId: row.userId,
            type: row.type as CreditTransactionType,
            amount: row.amount,
            balanceAfter: row.balanceAfter,
            referenceId: row.referenceId,
            referenceType: row.referenceType,
            metadata: row.metadata as Record<string, unknown> | null,
            createdAt: row.createdAt,
        }));
    }

    async recordActivity(userId: string, activityType: string): Promise<boolean> {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const activityId = idGenerator.generate('act');

        try {
            // Try to insert new activity record
            // If it already exists (unique constraint), this will fail
            await db.insert(userDailyActivity).values({
                id: activityId,
                userId,
                activityDate: today,
                activityType,
            });

            // Update last activity date on balance
            await db
                .update(userCreditBalance)
                .set({
                    lastActivityDate: today,
                    updatedAt: new Date(),
                })
                .where(eq(userCreditBalance.userId, userId));

            return true; // First activity today
        } catch (error) {
            // Unique constraint violation means already recorded today
            if ((error as Error).message?.includes('unique') ||
                (error as Error).message?.includes('duplicate')) {
                return false;
            }
            throw error;
        }
    }

    async updateTier(userId: string, tier: UserTier): Promise<void> {
        await db
            .update(userCreditBalance)
            .set({
                tier,
                updatedAt: new Date(),
            })
            .where(eq(userCreditBalance.userId, userId));
    }
}
