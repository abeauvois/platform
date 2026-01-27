/**
 * Webhook Routes
 * Handles Stripe webhook events
 */

import { Hono } from 'hono';
import type { PaymentService } from '@abeauvois/platform-gamification-domain';
import Stripe from 'stripe';

/**
 * Create webhook routes for Stripe events
 */
export function createWebhookRoutes(
    paymentService: PaymentService,
    stripeSecretKey: string,
    webhookSecret: string
) {
    const app = new Hono();
    const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-12-18.acacia',
    });

    // Stripe webhook endpoint
    // Note: This endpoint must receive raw body for signature verification
    app.post('/stripe', async (c) => {
        const signature = c.req.header('stripe-signature');

        if (!signature) {
            return c.json({ error: 'Missing stripe-signature header' }, 400);
        }

        try {
            // Get raw body for signature verification
            const rawBody = await c.req.text();

            // Verify webhook signature
            const event = stripe.webhooks.constructEvent(
                rawBody,
                signature,
                webhookSecret
            );

            // Handle the event
            switch (event.type) {
                case 'payment_intent.succeeded': {
                    const paymentIntent = event.data.object as Stripe.PaymentIntent;
                    console.log(`Payment succeeded: ${paymentIntent.id}`);
                    const success = await paymentService.handlePaymentSuccess(paymentIntent.id);
                    if (!success) {
                        console.error(`Failed to process payment: ${paymentIntent.id}`);
                    }
                    break;
                }

                case 'payment_intent.payment_failed': {
                    const paymentIntent = event.data.object as Stripe.PaymentIntent;
                    console.log(`Payment failed: ${paymentIntent.id}`);
                    // Payment failure is handled by not marking as completed
                    break;
                }

                case 'charge.refunded': {
                    const charge = event.data.object as Stripe.Charge;
                    if (charge.payment_intent) {
                        const paymentIntentId = typeof charge.payment_intent === 'string'
                            ? charge.payment_intent
                            : charge.payment_intent.id;
                        console.log(`Refund processed for: ${paymentIntentId}`);
                        const refundAmount = charge.amount_refunded;
                        await paymentService.handleRefund(paymentIntentId, refundAmount);
                    }
                    break;
                }

                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }

            return c.json({ received: true }, 200);
        } catch (error) {
            console.error('Webhook error:', error);
            const message = error instanceof Error ? error.message : 'Webhook processing failed';
            return c.json({ error: message }, 400);
        }
    });

    return app;
}
