/**
 * Gamification API Client
 * HTTP client for interacting with the gamification-api microservice
 */

import { BaseClient, type BaseClientConfig } from '@platform/sdk';
import type {
    CreditBalance,
    CreditTransaction,
    AccessContext,
    TradeAccessResult,
    Payment,
    PaymentIntent,
} from '@platform/gamification-domain';

export interface GamificationApiClientConfig extends BaseClientConfig {
    /** Fetch credentials mode for cookie handling (default: 'include' for browser) */
    credentials?: 'include' | 'omit' | 'same-origin';
}

/**
 * Pricing information response
 */
export interface PricingInfo {
    creditsPerEur: number;
    tier2MinPurchase: number;
    tier2MinAmountEur: number;
    packages: Array<{
        amountEur: number;
        credits: number;
        label: string;
        popular?: boolean;
    }>;
}

/**
 * Payment intent creation response
 */
export interface PaymentIntentResponse {
    clientSecret: string;
    amount: number;
    currency: string;
    creditsToReceive: number;
    willUpgradeToTier2: boolean;
}

/**
 * Payment history item
 */
export interface PaymentHistoryItem {
    id: string;
    amountEur: number;
    creditsGranted: number;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    createdAt: string;
}

/**
 * Gamification API Client
 * Extends BaseClient to reuse authentication functionality
 * Provides access to credits, payments, and access control operations
 */
export class GamificationApiClient extends BaseClient {
    constructor(config: GamificationApiClientConfig) {
        super({
            ...config,
            credentials: config.credentials ?? 'include', // Default to include for browser cookie auth
        });
    }

    // ============================================
    // Credit Balance Methods
    // ============================================

    /**
     * Get user's credit balance
     * Requires authentication
     */
    async getBalance(): Promise<CreditBalance> {
        try {
            this.logger.info('Fetching credit balance...');

            const response = await this.authenticatedRequest<CreditBalance & { createdAt: string; updatedAt: string }>(
                '/api/gamification/credits/balance',
                { method: 'GET' }
            );

            this.logger.info(`Balance fetched: ${response.balance} credits`);
            return {
                ...response,
                createdAt: new Date(response.createdAt),
                updatedAt: new Date(response.updatedAt),
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching balance: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get user's current access context
     * Requires authentication
     */
    async getAccessContext(orderValue?: number): Promise<AccessContext> {
        try {
            this.logger.info('Fetching access context...');

            const params = orderValue !== undefined ? `?orderValue=${orderValue}` : '';
            const context = await this.authenticatedRequest<AccessContext>(
                `/api/gamification/credits/access${params}`,
                { method: 'GET' }
            );

            this.logger.info(`Access context: canTrade=${context.canTrade}`);
            return context;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching access context: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get user's transaction history
     * Requires authentication
     */
    async getTransactions(limit?: number, offset?: number): Promise<Array<CreditTransaction>> {
        try {
            this.logger.info('Fetching transaction history...');

            const params = new URLSearchParams();
            if (limit !== undefined) params.set('limit', limit.toString());
            if (offset !== undefined) params.set('offset', offset.toString());
            const queryString = params.toString();

            const response = await this.authenticatedRequest<{
                transactions: Array<CreditTransaction & { createdAt: string }>;
                count: number;
            }>(
                `/api/gamification/credits/transactions${queryString ? `?${queryString}` : ''}`,
                { method: 'GET' }
            );

            this.logger.info(`Fetched ${response.count} transactions`);
            return response.transactions.map((t) => ({
                ...t,
                createdAt: new Date(t.createdAt),
            }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching transactions: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Check if user can execute a trade
     * Requires authentication
     */
    async canExecuteTrade(orderValue: number): Promise<TradeAccessResult> {
        try {
            this.logger.info(`Checking trade permission for $${orderValue}...`);

            const result = await this.authenticatedRequest<TradeAccessResult>(
                `/api/gamification/credits/can-trade?orderValue=${orderValue}`,
                { method: 'GET' }
            );

            this.logger.info(`Trade check result: allowed=${result.allowed}`);
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error checking trade permission: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Charge credits for a trade
     * Called after successful trade execution
     * Requires authentication
     */
    async chargeForTrade(orderId: string, tradeAmount: number): Promise<CreditTransaction> {
        try {
            this.logger.info(`Charging for trade ${orderId}...`);

            const response = await this.authenticatedRequest<CreditTransaction & { createdAt: string }>(
                '/api/gamification/credits/charge-trade',
                {
                    method: 'POST',
                    body: JSON.stringify({ orderId, tradeAmount }),
                }
            );

            this.logger.info('Trade charged successfully');
            return {
                ...response,
                createdAt: new Date(response.createdAt),
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error charging for trade: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Track user activity (charges 1 credit on first call of the day)
     * Requires authentication
     */
    async trackActivity(): Promise<void> {
        try {
            this.logger.info('Tracking activity...');

            await this.authenticatedRequest<{ charged: boolean }>(
                '/api/gamification/credits/track-activity',
                { method: 'POST' }
            );

            this.logger.info('Activity tracked');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error tracking activity: ${errorMessage}`);
            throw error;
        }
    }

    // ============================================
    // Payment Methods
    // ============================================

    /**
     * Get pricing information
     * Public - no authentication required
     */
    async getPricing(): Promise<PricingInfo> {
        try {
            this.logger.info('Fetching pricing info...');

            const response = await fetch(
                `${this.baseUrl}/api/gamification/payments/pricing`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch pricing: ${response.statusText}`);
            }

            const pricing = await response.json() as PricingInfo;
            this.logger.info('Pricing info fetched');
            return pricing;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching pricing: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Create a payment intent for credit purchase
     * Requires authentication
     */
    async createPaymentIntent(amountEur: number): Promise<PaymentIntentResponse> {
        try {
            this.logger.info(`Creating payment intent for ${amountEur} cents...`);

            const response = await this.authenticatedRequest<PaymentIntentResponse>(
                '/api/gamification/payments/create-intent',
                {
                    method: 'POST',
                    body: JSON.stringify({ amountEur }),
                }
            );

            this.logger.info('Payment intent created');
            return response;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error creating payment intent: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get payment history
     * Requires authentication
     */
    async getPaymentHistory(limit?: number): Promise<Array<PaymentHistoryItem>> {
        try {
            this.logger.info('Fetching payment history...');

            const params = limit !== undefined ? `?limit=${limit}` : '';
            const response = await this.authenticatedRequest<{
                payments: Array<PaymentHistoryItem>;
                count: number;
            }>(
                `/api/gamification/payments/history${params}`,
                { method: 'GET' }
            );

            this.logger.info(`Fetched ${response.count} payments`);
            return response.payments;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching payment history: ${errorMessage}`);
            throw error;
        }
    }
}
