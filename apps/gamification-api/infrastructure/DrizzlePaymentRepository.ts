/**
 * Drizzle Payment Repository
 * Database implementation of IPaymentRepository
 */

import { eq, desc } from 'drizzle-orm';
import { db } from '@platform/db';
import { payments } from '@platform/db/schema';
import type { IPaymentRepository, CreatePaymentData } from '@platform/gamification-domain';
import type { Payment, PaymentStatus } from '@platform/gamification-domain';

export class DrizzlePaymentRepository implements IPaymentRepository {
    async create(data: CreatePaymentData): Promise<Payment> {
        const now = new Date();

        await db.insert(payments).values({
            id: data.id,
            userId: data.userId,
            stripePaymentIntentId: data.stripePaymentIntentId,
            amountEur: data.amountEur,
            creditsGranted: data.creditsGranted,
            status: data.status,
            createdAt: now,
            updatedAt: now,
        });

        return {
            id: data.id,
            userId: data.userId,
            stripePaymentIntentId: data.stripePaymentIntentId,
            amountEur: data.amountEur,
            creditsGranted: data.creditsGranted,
            status: data.status,
            createdAt: now,
            updatedAt: now,
        };
    }

    async findById(id: string): Promise<Payment | null> {
        const result = await db
            .select()
            .from(payments)
            .where(eq(payments.id, id))
            .limit(1);

        if (result.length === 0) {
            return null;
        }

        return this.mapToPayment(result[0]);
    }

    async findByStripePaymentIntentId(intentId: string): Promise<Payment | null> {
        const result = await db
            .select()
            .from(payments)
            .where(eq(payments.stripePaymentIntentId, intentId))
            .limit(1);

        if (result.length === 0) {
            return null;
        }

        return this.mapToPayment(result[0]);
    }

    async updateStatus(id: string, status: PaymentStatus): Promise<Payment> {
        const now = new Date();

        await db
            .update(payments)
            .set({
                status,
                updatedAt: now,
            })
            .where(eq(payments.id, id));

        const updated = await this.findById(id);
        if (!updated) {
            throw new Error(`Payment ${id} not found after update`);
        }

        return updated;
    }

    async findByUserId(userId: string, limit = 50): Promise<Array<Payment>> {
        const result = await db
            .select()
            .from(payments)
            .where(eq(payments.userId, userId))
            .orderBy(desc(payments.createdAt))
            .limit(limit);

        return result.map((row) => this.mapToPayment(row));
    }

    private mapToPayment(row: typeof payments.$inferSelect): Payment {
        return {
            id: row.id,
            userId: row.userId,
            stripePaymentIntentId: row.stripePaymentIntentId,
            amountEur: row.amountEur,
            creditsGranted: row.creditsGranted,
            status: row.status as PaymentStatus,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
}
