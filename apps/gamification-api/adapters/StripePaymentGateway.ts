/**
 * Stripe Payment Gateway
 * Implementation of IPaymentGateway using Stripe
 */

import Stripe from 'stripe';
import type { IPaymentGateway, CreatePaymentIntentParams, PaymentIntent } from '@abeauvois/platform-gamification-domain';

export class StripePaymentGateway implements IPaymentGateway {
    private stripe: Stripe;

    constructor(secretKey: string) {
        this.stripe = new Stripe(secretKey, {
            apiVersion: '2024-12-18.acacia',
        });
    }

    async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
        const paymentIntent = await this.stripe.paymentIntents.create({
            amount: params.amountEur,
            currency: 'eur',
            receipt_email: params.email,
            metadata: params.metadata,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        return {
            id: paymentIntent.id,
            clientSecret: paymentIntent.client_secret || '',
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
        };
    }

    async confirmPayment(paymentIntentId: string): Promise<boolean> {
        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            return paymentIntent.status === 'succeeded';
        } catch {
            return false;
        }
    }

    async createRefund(paymentIntentId: string, amount?: number): Promise<boolean> {
        try {
            const refundParams: Stripe.RefundCreateParams = {
                payment_intent: paymentIntentId,
            };

            if (amount !== undefined) {
                refundParams.amount = amount;
            }

            const refund = await this.stripe.refunds.create(refundParams);
            return refund.status === 'succeeded' || refund.status === 'pending';
        } catch {
            return false;
        }
    }
}
