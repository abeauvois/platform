/**
 * Payment Gateway Port
 * Interface for external payment provider operations
 */

import type { PaymentIntent } from '../types.js';

/**
 * Parameters for creating a payment intent
 */
export interface CreatePaymentIntentParams {
    amountEur: number;  // Amount in cents
    email: string;
    metadata?: Record<string, string>;
}

/**
 * Payment gateway interface
 */
export interface IPaymentGateway {
    /**
     * Create a payment intent for credit purchase
     * @returns Payment intent with client secret for frontend
     */
    createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent>;

    /**
     * Confirm that a payment was successful
     * @returns true if payment is confirmed
     */
    confirmPayment(paymentIntentId: string): Promise<boolean>;

    /**
     * Create a refund for a payment
     * @param paymentIntentId - The payment intent to refund
     * @param amount - Optional partial refund amount in cents (full refund if not specified)
     * @returns true if refund was successful
     */
    createRefund(paymentIntentId: string, amount?: number): Promise<boolean>;
}
