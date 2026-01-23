/**
 * PaymentService
 * Domain service for payment orchestration
 */

import type { IPaymentRepository } from '../ports/IPaymentRepository.js';
import type { IPaymentGateway } from '../ports/IPaymentGateway.js';
import type { IIdGenerator } from '../ports/IIdGenerator.js';
import type { ICreditRepository } from '../ports/ICreditRepository.js';
import type {
    CreatePaymentIntentData,
    PaymentIntent,
    Payment,
} from '../types.js';
import {
    CREDITS_PER_EUR,
    TIER2_MIN_PURCHASE,
} from '../types.js';

/**
 * Error thrown when a payment operation fails
 */
export class PaymentError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PaymentError';
    }
}

/**
 * Service for managing payments and credit purchases
 */
export class PaymentService {
    constructor(
        private readonly paymentRepository: IPaymentRepository,
        private readonly paymentGateway: IPaymentGateway,
        private readonly idGenerator: IIdGenerator,
        private readonly creditRepository: ICreditRepository
    ) {}

    /**
     * Create a payment intent for credit purchase
     * @param data - Payment intent data
     * @returns Payment intent with client secret for frontend
     */
    async createPaymentIntent(data: CreatePaymentIntentData): Promise<PaymentIntent> {
        // Calculate credits from EUR amount (amount is in cents)
        const eurAmount = data.amountEur / 100;
        const creditsGranted = Math.floor(eurAmount * CREDITS_PER_EUR);

        // Create Stripe payment intent
        const paymentIntent = await this.paymentGateway.createPaymentIntent({
            amountEur: data.amountEur,
            email: data.email,
            metadata: {
                userId: data.userId,
                tier: data.tier,
            },
        });

        // Create payment record
        const paymentId = this.idGenerator.generate('payment');
        await this.paymentRepository.create({
            id: paymentId,
            userId: data.userId,
            stripePaymentIntentId: paymentIntent.id,
            amountEur: data.amountEur,
            creditsGranted,
            status: 'pending',
        });

        return paymentIntent;
    }

    /**
     * Handle successful payment from webhook
     * @param paymentIntentId - Stripe payment intent ID
     * @returns true if handled successfully
     */
    async handlePaymentSuccess(paymentIntentId: string): Promise<boolean> {
        const payment = await this.paymentRepository.findByStripePaymentIntentId(paymentIntentId);
        if (!payment) {
            return false;
        }

        // Already processed
        if (payment.status === 'completed') {
            return true;
        }

        // Verify with Stripe
        const confirmed = await this.paymentGateway.confirmPayment(paymentIntentId);
        if (!confirmed) {
            await this.paymentRepository.updateStatus(payment.id, 'failed');
            return false;
        }

        // Update payment status
        await this.paymentRepository.updateStatus(payment.id, 'completed');

        // Add credits to user
        await this.creditRepository.addCredits(
            payment.userId,
            payment.creditsGranted,
            'purchase',
            payment.id,
            'payment',
            undefined
        );

        // Upgrade tier if needed
        const balance = await this.creditRepository.getBalance(payment.userId);
        if (balance) {
            let newTier = balance.tier;
            if (balance.tier === 'free') {
                newTier = 'paid_tier1';
            }
            if (payment.creditsGranted >= TIER2_MIN_PURCHASE) {
                newTier = 'paid_tier2';
            }
            if (newTier !== balance.tier) {
                await this.creditRepository.updateTier(payment.userId, newTier);
            }
        }

        return true;
    }

    /**
     * Handle payment refund
     * @param paymentIntentId - Stripe payment intent ID
     * @param refundAmount - Optional partial refund amount in cents
     * @returns true if refund handled successfully
     */
    async handleRefund(paymentIntentId: string, refundAmount?: number): Promise<boolean> {
        const payment = await this.paymentRepository.findByStripePaymentIntentId(paymentIntentId);
        if (!payment) {
            return false;
        }

        if (payment.status !== 'completed') {
            return false;
        }

        // Process refund with Stripe
        const refunded = await this.paymentGateway.createRefund(paymentIntentId, refundAmount);
        if (!refunded) {
            return false;
        }

        // Calculate credits to deduct
        let creditsToDeduct: number;
        let isPartialRefund = false;

        if (refundAmount !== undefined && refundAmount < payment.amountEur) {
            // Partial refund - calculate proportional credits
            const refundEur = refundAmount / 100;
            creditsToDeduct = Math.floor(refundEur * CREDITS_PER_EUR);
            isPartialRefund = true;
        } else {
            // Full refund
            creditsToDeduct = payment.creditsGranted;
        }

        // Deduct credits
        await this.creditRepository.deductCredits(
            payment.userId,
            creditsToDeduct,
            'refund',
            payment.id,
            'payment',
            isPartialRefund ? { partialRefund: true, refundAmount } : undefined
        );

        // Update payment status for full refunds
        if (!isPartialRefund) {
            await this.paymentRepository.updateStatus(payment.id, 'refunded');
        }

        return true;
    }

    /**
     * Get payment by ID
     */
    async getPayment(paymentId: string): Promise<Payment | null> {
        return this.paymentRepository.findById(paymentId);
    }

    /**
     * Get user's payment history
     */
    async getPaymentHistory(userId: string, limit = 50): Promise<Array<Payment>> {
        return this.paymentRepository.findByUserId(userId, limit);
    }
}
