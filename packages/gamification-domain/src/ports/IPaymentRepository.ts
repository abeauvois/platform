/**
 * Payment Repository Port
 * Interface for payment record operations
 */

import type { Payment, PaymentStatus } from '../types';

/**
 * Data for creating a payment record
 */
export interface CreatePaymentData {
    id: string;
    userId: string;
    stripePaymentIntentId: string;
    amountEur: number;
    creditsGranted: number;
    status: PaymentStatus;
}

/**
 * Payment repository interface
 */
export interface IPaymentRepository {
    /**
     * Create a new payment record
     */
    create(data: CreatePaymentData): Promise<Payment>;

    /**
     * Find payment by ID
     */
    findById(id: string): Promise<Payment | null>;

    /**
     * Find payment by Stripe Payment Intent ID
     */
    findByStripePaymentIntentId(intentId: string): Promise<Payment | null>;

    /**
     * Update payment status
     */
    updateStatus(id: string, status: PaymentStatus): Promise<Payment>;

    /**
     * Get payments by user ID
     */
    findByUserId(userId: string, limit?: number): Promise<Array<Payment>>;
}
