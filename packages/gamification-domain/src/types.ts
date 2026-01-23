/**
 * Gamification Domain Types
 * Core domain types for credits and payment operations
 */

// ============================================================================
// Constants
// ============================================================================

/** Exchange rate: 1 EUR = 10 Credits */
export const CREDITS_PER_EUR = 10;

/** Free credits for new users */
export const FREE_CREDITS = 50;

/** Cost for first API call each day */
export const DAILY_ACTIVE_COST = 1;

/** Base cost per executed trade */
export const TRADE_BASE_COST = 1;

/** Minimum credits to purchase for Tier 2 */
export const TIER2_MIN_PURCHASE = 1000;

/** Order value threshold requiring Tier 2 (in USD) */
export const ORDER_THRESHOLD_TIER2 = 500;

// ============================================================================
// Enums / Type Aliases
// ============================================================================

/**
 * Types of credit transactions
 */
export type CreditTransactionType =
    | 'daily_active'   // Daily activity charge (first API call of day)
    | 'trade'          // Trade execution charge
    | 'purchase'       // Credits purchased
    | 'refund'         // Refund from payment reversal
    | 'bonus';         // Promotional bonus credits

/**
 * User tier levels
 */
export type UserTier =
    | 'free'        // Default tier, 50 free credits
    | 'paid_tier1'  // Has purchased credits (orders < $500)
    | 'paid_tier2'; // Premium tier (orders > $500 allowed)

/**
 * Payment status
 */
export type PaymentStatus =
    | 'pending'
    | 'completed'
    | 'failed'
    | 'refunded';

// ============================================================================
// Entities
// ============================================================================

/**
 * User credit balance
 */
export interface CreditBalance {
    userId: string;
    balance: number;
    lifetimeSpent: number;
    tier: UserTier;
    lastActivityDate: string | null;  // YYYY-MM-DD format
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Credit transaction (ledger entry)
 */
export interface CreditTransaction {
    id: string;
    userId: string;
    type: CreditTransactionType;
    amount: number;  // Positive for additions, negative for deductions
    balanceAfter: number;
    referenceId: string | null;
    referenceType: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
}

/**
 * Payment record
 */
export interface Payment {
    id: string;
    userId: string;
    stripePaymentIntentId: string;
    amountEur: number;  // Amount in cents
    creditsGranted: number;
    status: PaymentStatus;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Daily activity record
 */
export interface DailyActivity {
    id: string;
    userId: string;
    activityDate: string;  // YYYY-MM-DD
    chargedAt: Date;
    activityType: string;
}

// ============================================================================
// Access Context (computed from balance/tier)
// ============================================================================

/**
 * Access context determines what a user can do based on their credits status
 */
export interface AccessContext {
    /** Whether user can execute trades */
    canTrade: boolean;
    /** Whether user can view real-time data */
    canViewRealtime: boolean;
    /** Whether to show ads to user */
    showAds: boolean;
    /** Whether user needs to upgrade/purchase credits */
    requiresUpgrade: boolean;
    /** Minimum credits needed to resume trading */
    requiredCredits: number;
    /** Current debt amount (0 if balance is positive) */
    currentDebt: number;
    /** Reason for restricted access (if any) */
    restrictionReason: string | null;
}

// ============================================================================
// Service Input Types
// ============================================================================

/**
 * Data for creating a payment intent
 */
export interface CreatePaymentIntentData {
    userId: string;
    email: string;
    amountEur: number;  // Amount in cents
    tier: UserTier;
}

/**
 * Stripe Payment Intent response
 */
export interface PaymentIntent {
    id: string;
    clientSecret: string;
    amount: number;
    currency: string;
    status: string;
}

/**
 * Data for initializing a new user's credit balance
 */
export interface InitializeCreditBalanceData {
    userId: string;
}

/**
 * Result of a trade credit check
 */
export interface TradeAccessResult {
    allowed: boolean;
    reason: string | null;
    requiredCredits: number;
}
