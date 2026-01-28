/**
 * Credit Repository Port
 * Interface for credit balance and transaction operations
 */

import type {
    CreditBalance,
    CreditTransaction,
    CreditTransactionType,
} from '../types';

/**
 * Data for creating a credit transaction
 */
export interface CreateTransactionData {
    userId: string;
    type: CreditTransactionType;
    amount: number;
    referenceId?: string;
    referenceType?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Credit repository interface
 */
export interface ICreditRepository {
    /**
     * Get user's current credit balance
     * @returns Balance or null if not found
     */
    getBalance(userId: string): Promise<CreditBalance | null>;

    /**
     * Initialize balance for a new user with free credits
     * @returns The newly created balance
     */
    initializeBalance(userId: string): Promise<CreditBalance>;

    /**
     * Deduct credits from user's balance
     * Creates a transaction and updates the balance
     * @returns The created transaction
     */
    deductCredits(
        userId: string,
        amount: number,
        type: CreditTransactionType,
        referenceId?: string,
        referenceType?: string,
        metadata?: Record<string, unknown>
    ): Promise<CreditTransaction>;

    /**
     * Add credits to user's balance
     * Creates a transaction and updates the balance
     * @returns The created transaction
     */
    addCredits(
        userId: string,
        amount: number,
        type: CreditTransactionType,
        referenceId?: string,
        referenceType?: string,
        metadata?: Record<string, unknown>
    ): Promise<CreditTransaction>;

    /**
     * Get user's transaction history
     */
    getTransactions(
        userId: string,
        limit?: number,
        offset?: number
    ): Promise<Array<CreditTransaction>>;

    /**
     * Record user activity for the day
     * @returns true if this is the first activity today (should charge), false otherwise
     */
    recordActivity(userId: string, activityType: string): Promise<boolean>;

    /**
     * Update user's tier
     */
    updateTier(userId: string, tier: CreditBalance['tier']): Promise<void>;
}
