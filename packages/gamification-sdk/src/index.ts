/**
 * Gamification SDK
 * Client SDK for gamification operations, extending platform authentication
 */

// API Client
export {
    GamificationApiClient,
    type GamificationApiClientConfig,
    type PricingInfo,
    type PaymentIntentResponse,
    type PaymentHistoryItem,
} from './GamificationApiClient.js';

// Re-export domain types for convenience
export type {
    CreditBalance,
    CreditTransaction,
    CreditTransactionType,
    AccessContext,
    TradeAccessResult,
    UserTier,
    Payment,
    PaymentStatus,
    PaymentIntent,
} from '@abeauvois/platform-gamification-domain';

// Re-export constants from domain
export {
    CREDITS_PER_EUR,
    FREE_CREDITS,
    DAILY_ACTIVE_COST,
    TRADE_BASE_COST,
    TIER2_MIN_PURCHASE,
    ORDER_THRESHOLD_TIER2,
} from '@abeauvois/platform-gamification-domain';
