/**
 * CreditService Tests
 * Tests for credit business logic
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { CreditService } from './CreditService';
import type { ICreditRepository } from '../ports/ICreditRepository';
import type { CreditBalance, CreditTransaction } from '../types';
import {
    FREE_CREDITS,
    DAILY_ACTIVE_COST,
    TRADE_BASE_COST,
    ORDER_THRESHOLD_TIER2,
} from '../types';

// Mock repository factory
function createMockRepository(overrides?: Partial<ICreditRepository>): ICreditRepository {
    return {
        getBalance: mock(() => Promise.resolve(null)),
        initializeBalance: mock(() => Promise.resolve(createMockBalance())),
        deductCredits: mock(() => Promise.resolve(createMockTransaction(-1))),
        addCredits: mock(() => Promise.resolve(createMockTransaction(1))),
        getTransactions: mock(() => Promise.resolve([])),
        recordActivity: mock(() => Promise.resolve(true)),
        updateTier: mock(() => Promise.resolve()),
        ...overrides,
    };
}

// Helper to create mock balance
function createMockBalance(overrides?: Partial<CreditBalance>): CreditBalance {
    return {
        userId: 'user-1',
        balance: FREE_CREDITS,
        lifetimeSpent: 0,
        tier: 'free',
        lastActivityDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

// Helper to create mock transaction
function createMockTransaction(amount: number): CreditTransaction {
    return {
        id: 'tx-1',
        userId: 'user-1',
        type: amount > 0 ? 'purchase' : 'daily_active',
        amount,
        balanceAfter: FREE_CREDITS + amount,
        referenceId: null,
        referenceType: null,
        metadata: null,
        createdAt: new Date(),
    };
}

describe('CreditService', () => {
    describe('getBalance', () => {
        test('should return existing balance', async () => {
            const existingBalance = createMockBalance({ balance: 25 });
            const repo = createMockRepository({
                getBalance: mock(() => Promise.resolve(existingBalance)),
            });
            const service = new CreditService(repo);

            const balance = await service.getBalance('user-1');

            expect(balance).toEqual(existingBalance);
        });

        test('should initialize balance for new user', async () => {
            const newBalance = createMockBalance({ balance: FREE_CREDITS });
            const repo = createMockRepository({
                getBalance: mock(() => Promise.resolve(null)),
                initializeBalance: mock(() => Promise.resolve(newBalance)),
            });
            const service = new CreditService(repo);

            const balance = await service.getBalance('user-1');

            expect(balance.balance).toBe(FREE_CREDITS);
            expect(repo.initializeBalance).toHaveBeenCalledWith('user-1');
        });
    });

    describe('trackActivity', () => {
        test('should charge 1 credit on first activity of the day', async () => {
            const balance = createMockBalance({ balance: 50 });
            const repo = createMockRepository({
                getBalance: mock(() => Promise.resolve(balance)),
                recordActivity: mock(() => Promise.resolve(true)), // First activity
                deductCredits: mock(() => Promise.resolve(createMockTransaction(-DAILY_ACTIVE_COST))),
            });
            const service = new CreditService(repo);

            await service.trackActivity('user-1');

            expect(repo.deductCredits).toHaveBeenCalledWith(
                'user-1',
                DAILY_ACTIVE_COST,
                'daily_active',
                undefined,
                undefined,
                undefined
            );
        });

        test('should not charge on subsequent activities same day', async () => {
            const balance = createMockBalance({ balance: 50 });
            const repo = createMockRepository({
                getBalance: mock(() => Promise.resolve(balance)),
                recordActivity: mock(() => Promise.resolve(false)), // Not first activity
            });
            const service = new CreditService(repo);

            await service.trackActivity('user-1');

            expect(repo.deductCredits).not.toHaveBeenCalled();
        });

        test('should charge even when balance is negative (debt)', async () => {
            const balance = createMockBalance({ balance: -10 });
            const repo = createMockRepository({
                getBalance: mock(() => Promise.resolve(balance)),
                recordActivity: mock(() => Promise.resolve(true)),
                deductCredits: mock(() => Promise.resolve(createMockTransaction(-DAILY_ACTIVE_COST))),
            });
            const service = new CreditService(repo);

            await service.trackActivity('user-1');

            expect(repo.deductCredits).toHaveBeenCalled();
        });
    });

    describe('getAccessContext', () => {
        test('should allow trading for free tier with positive balance', async () => {
            const balance = createMockBalance({ balance: 30, lifetimeSpent: 10 });
            const repo = createMockRepository({
                getBalance: mock(() => Promise.resolve(balance)),
            });
            const service = new CreditService(repo);

            const context = await service.getAccessContext('user-1');

            expect(context.canTrade).toBe(true);
            expect(context.canViewRealtime).toBe(true);
            expect(context.showAds).toBe(false);
            expect(context.currentDebt).toBe(0);
        });

        test('should block trading when in debt and free tier exhausted', async () => {
            const balance = createMockBalance({
                balance: -5,
                lifetimeSpent: 55, // Spent more than FREE_CREDITS
                tier: 'free',
            });
            const repo = createMockRepository({
                getBalance: mock(() => Promise.resolve(balance)),
            });
            const service = new CreditService(repo);

            const context = await service.getAccessContext('user-1');

            expect(context.canTrade).toBe(false);
            expect(context.showAds).toBe(true);
            expect(context.currentDebt).toBe(5);
            expect(context.requiresUpgrade).toBe(true);
        });

        test('should still allow trading during free tier even with negative balance', async () => {
            const balance = createMockBalance({
                balance: -5,
                lifetimeSpent: 40, // Still within free tier (50)
                tier: 'free',
            });
            const repo = createMockRepository({
                getBalance: mock(() => Promise.resolve(balance)),
            });
            const service = new CreditService(repo);

            const context = await service.getAccessContext('user-1');

            // Within free tier, can still trade
            expect(context.canTrade).toBe(true);
        });

        test('should block large orders without tier2', async () => {
            const balance = createMockBalance({
                balance: 100,
                tier: 'paid_tier1',
            });
            const repo = createMockRepository({
                getBalance: mock(() => Promise.resolve(balance)),
            });
            const service = new CreditService(repo);

            // Order value > $500 requires tier2
            const context = await service.getAccessContext('user-1', ORDER_THRESHOLD_TIER2 + 100);

            expect(context.canTrade).toBe(false);
            expect(context.restrictionReason).toContain('Tier 2');
        });

        test('should allow large orders with tier2', async () => {
            const balance = createMockBalance({
                balance: 100,
                tier: 'paid_tier2',
            });
            const repo = createMockRepository({
                getBalance: mock(() => Promise.resolve(balance)),
            });
            const service = new CreditService(repo);

            const context = await service.getAccessContext('user-1', ORDER_THRESHOLD_TIER2 + 100);

            expect(context.canTrade).toBe(true);
        });
    });

    describe('canExecuteTrade', () => {
        test('should return allowed for valid trade', async () => {
            const balance = createMockBalance({ balance: 30 });
            const repo = createMockRepository({
                getBalance: mock(() => Promise.resolve(balance)),
            });
            const service = new CreditService(repo);

            const result = await service.canExecuteTrade('user-1', 100);

            expect(result.allowed).toBe(true);
            expect(result.reason).toBeNull();
        });

        test('should return not allowed with reason for blocked trade', async () => {
            const balance = createMockBalance({
                balance: -10,
                lifetimeSpent: 60,
                tier: 'free',
            });
            const repo = createMockRepository({
                getBalance: mock(() => Promise.resolve(balance)),
            });
            const service = new CreditService(repo);

            const result = await service.canExecuteTrade('user-1', 100);

            expect(result.allowed).toBe(false);
            expect(result.reason).not.toBeNull();
            expect(result.requiredCredits).toBeGreaterThan(0);
        });
    });

    describe('deductForTrade', () => {
        test('should deduct trade cost when trade is allowed', async () => {
            const balance = createMockBalance({ balance: 30 });
            const transaction = createMockTransaction(-TRADE_BASE_COST);
            const repo = createMockRepository({
                getBalance: mock(() => Promise.resolve(balance)),
                deductCredits: mock(() => Promise.resolve(transaction)),
            });
            const service = new CreditService(repo);

            const result = await service.deductForTrade('user-1', 'order-123', 200);

            expect(result).toEqual(transaction);
            expect(repo.deductCredits).toHaveBeenCalledWith(
                'user-1',
                TRADE_BASE_COST,
                'trade',
                'order-123',
                'order',
                { tradeAmount: 200 }
            );
        });

        test('should throw error when trade is not allowed', async () => {
            const balance = createMockBalance({
                balance: -10,
                lifetimeSpent: 60,
                tier: 'free',
            });
            const repo = createMockRepository({
                getBalance: mock(() => Promise.resolve(balance)),
            });
            const service = new CreditService(repo);

            await expect(service.deductForTrade('user-1', 'order-123', 200)).rejects.toThrow();
        });
    });

    describe('addPurchasedCredits', () => {
        test('should add credits and upgrade to tier1 if free', async () => {
            const balance = createMockBalance({ tier: 'free' });
            const transaction = createMockTransaction(100);
            const repo = createMockRepository({
                getBalance: mock(() => Promise.resolve(balance)),
                addCredits: mock(() => Promise.resolve(transaction)),
                updateTier: mock(() => Promise.resolve()),
            });
            const service = new CreditService(repo);

            await service.addPurchasedCredits('user-1', 100, 'payment-123');

            expect(repo.addCredits).toHaveBeenCalledWith(
                'user-1',
                100,
                'purchase',
                'payment-123',
                'payment',
                undefined
            );
            expect(repo.updateTier).toHaveBeenCalledWith('user-1', 'paid_tier1');
        });

        test('should upgrade to tier2 when purchasing 1000+ credits', async () => {
            const balance = createMockBalance({ tier: 'paid_tier1' });
            const transaction = createMockTransaction(1000);
            const repo = createMockRepository({
                getBalance: mock(() => Promise.resolve(balance)),
                addCredits: mock(() => Promise.resolve(transaction)),
                updateTier: mock(() => Promise.resolve()),
            });
            const service = new CreditService(repo);

            await service.addPurchasedCredits('user-1', 1000, 'payment-123');

            expect(repo.updateTier).toHaveBeenCalledWith('user-1', 'paid_tier2');
        });
    });
});
