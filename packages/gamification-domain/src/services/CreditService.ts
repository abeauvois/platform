/**
 * CreditService
 * Domain service for credit-related business logic
 */

import type { ICreditRepository } from '../ports/ICreditRepository';
import type {
    CreditBalance,
    CreditTransaction,
    AccessContext,
    TradeAccessResult,
} from '../types';
import {
    FREE_CREDITS,
    DAILY_ACTIVE_COST,
    TRADE_BASE_COST,
    ORDER_THRESHOLD_TIER2,
    TIER2_MIN_PURCHASE,
} from '../types';

/**
 * Error thrown when a credit operation fails
 */
export class CreditError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CreditError';
    }
}

/**
 * Service for managing user credits and access control
 */
export class CreditService {
    constructor(private readonly creditRepository: ICreditRepository) {}

    /**
     * Get user's credit balance, initializing if new user
     */
    async getBalance(userId: string): Promise<CreditBalance> {
        const balance = await this.creditRepository.getBalance(userId);
        if (balance) {
            return balance;
        }
        return this.creditRepository.initializeBalance(userId);
    }

    /**
     * Track user activity for the day
     * Charges 1 credit on first API call of the day
     */
    async trackActivity(userId: string, activityType = 'api_call'): Promise<void> {
        // Ensure balance exists
        await this.getBalance(userId);

        // Record activity - returns true if first activity today
        const isFirstToday = await this.creditRepository.recordActivity(userId, activityType);

        if (isFirstToday) {
            // Charge for daily activity (even if in debt)
            await this.creditRepository.deductCredits(
                userId,
                DAILY_ACTIVE_COST,
                'daily_active',
                undefined,
                undefined,
                undefined
            );
        }
    }

    /**
     * Get user's current access context based on balance and tier
     */
    async getAccessContext(userId: string, orderValue?: number): Promise<AccessContext> {
        const balance = await this.getBalance(userId);

        const currentDebt = balance.balance < 0 ? Math.abs(balance.balance) : 0;
        const freeTierExhausted = balance.lifetimeSpent >= FREE_CREDITS;
        const inDebtAfterFreeTier = currentDebt > 0 && freeTierExhausted && balance.tier === 'free';

        // Base access check - trading blocked if in debt after free tier exhausted
        let canTrade = !inDebtAfterFreeTier;
        let restrictionReason: string | null = null;

        if (inDebtAfterFreeTier) {
            restrictionReason = 'Free credits exhausted. Purchase credits to continue trading.';
        }

        // Large order check - requires tier2
        if (canTrade && orderValue !== undefined && orderValue > ORDER_THRESHOLD_TIER2) {
            if (balance.tier !== 'paid_tier2') {
                canTrade = false;
                restrictionReason = `Orders over $${ORDER_THRESHOLD_TIER2} require Tier 2. Purchase ${TIER2_MIN_PURCHASE}+ credits to upgrade.`;
            }
        }

        // Compute required credits to resume trading
        let requiredCredits = 0;
        if (!canTrade) {
            if (inDebtAfterFreeTier) {
                // Need to clear debt + have at least 1 credit
                requiredCredits = currentDebt + 1;
            } else if (orderValue !== undefined && orderValue > ORDER_THRESHOLD_TIER2) {
                // Need tier2 upgrade
                requiredCredits = TIER2_MIN_PURCHASE;
            }
        }

        return {
            canTrade,
            canViewRealtime: !inDebtAfterFreeTier,
            showAds: inDebtAfterFreeTier,
            requiresUpgrade: !canTrade,
            requiredCredits,
            currentDebt,
            restrictionReason,
        };
    }

    /**
     * Check if user can execute a trade
     */
    async canExecuteTrade(userId: string, orderValue: number): Promise<TradeAccessResult> {
        const context = await this.getAccessContext(userId, orderValue);
        return {
            allowed: context.canTrade,
            reason: context.restrictionReason,
            requiredCredits: context.requiredCredits,
        };
    }

    /**
     * Deduct credits for an executed trade
     * @throws CreditError if trade is not allowed
     */
    async deductForTrade(
        userId: string,
        orderId: string,
        tradeAmount: number
    ): Promise<CreditTransaction> {
        const access = await this.canExecuteTrade(userId, tradeAmount);
        if (!access.allowed) {
            throw new CreditError(access.reason || 'Trade not allowed');
        }

        return this.creditRepository.deductCredits(
            userId,
            TRADE_BASE_COST,
            'trade',
            orderId,
            'order',
            { tradeAmount }
        );
    }

    /**
     * Add purchased credits to user's balance
     */
    async addPurchasedCredits(
        userId: string,
        credits: number,
        paymentId: string
    ): Promise<CreditTransaction> {
        const balance = await this.getBalance(userId);
        const transaction = await this.creditRepository.addCredits(
            userId,
            credits,
            'purchase',
            paymentId,
            'payment',
            undefined
        );

        // Determine tier upgrade
        let newTier = balance.tier;
        if (balance.tier === 'free') {
            newTier = 'paid_tier1';
        }
        if (credits >= TIER2_MIN_PURCHASE) {
            newTier = 'paid_tier2';
        }

        if (newTier !== balance.tier) {
            await this.creditRepository.updateTier(userId, newTier);
        }

        return transaction;
    }

    /**
     * Get user's transaction history
     */
    async getTransactions(
        userId: string,
        limit = 50,
        offset = 0
    ): Promise<Array<CreditTransaction>> {
        return this.creditRepository.getTransactions(userId, limit, offset);
    }
}
