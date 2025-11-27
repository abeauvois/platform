/**
 * Trading SDK
 * Client SDK for trading operations, extending platform authentication
 */

// API Client
export { TradingApiClient } from './TradingApiClient.js';

// Types
export type {
    Position,
    Order,
    CreateOrderData,
    MarketTicker,
    AccountBalance,
    Portfolio,
    Trade,
} from './types.js';

// Re-export auth types from platform SDK for convenience
export type {
    SignUpData,
    SignInData,
    AuthResponse,
} from '@platform/sdk';
