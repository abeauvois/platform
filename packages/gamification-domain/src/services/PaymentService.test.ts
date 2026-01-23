/**
 * PaymentService Tests
 * Tests for payment orchestration logic
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { PaymentService } from './PaymentService.js';
import type { IPaymentRepository } from '../ports/IPaymentRepository.js';
import type { IPaymentGateway } from '../ports/IPaymentGateway.js';
import type { IIdGenerator } from '../ports/IIdGenerator.js';
import type { ICreditRepository } from '../ports/ICreditRepository.js';
import type { Payment, PaymentIntent, CreditBalance } from '../types.js';
import { CREDITS_PER_EUR, FREE_CREDITS } from '../types.js';

// Mock factories
function createMockPaymentRepo(overrides?: Partial<IPaymentRepository>): IPaymentRepository {
    return {
        create: mock(() => Promise.resolve(createMockPayment())),
        findById: mock(() => Promise.resolve(null)),
        findByStripePaymentIntentId: mock(() => Promise.resolve(null)),
        updateStatus: mock(() => Promise.resolve(createMockPayment())),
        findByUserId: mock(() => Promise.resolve([])),
        ...overrides,
    };
}

function createMockGateway(overrides?: Partial<IPaymentGateway>): IPaymentGateway {
    return {
        createPaymentIntent: mock(() => Promise.resolve(createMockPaymentIntent())),
        confirmPayment: mock(() => Promise.resolve(true)),
        createRefund: mock(() => Promise.resolve(true)),
        ...overrides,
    };
}

function createMockIdGenerator(): IIdGenerator {
    return {
        generate: mock(() => 'payment-123'),
    };
}

function createMockCreditRepo(overrides?: Partial<ICreditRepository>): ICreditRepository {
    return {
        getBalance: mock(() => Promise.resolve(createMockBalance())),
        initializeBalance: mock(() => Promise.resolve(createMockBalance())),
        deductCredits: mock(() => Promise.resolve({} as any)),
        addCredits: mock(() => Promise.resolve({} as any)),
        getTransactions: mock(() => Promise.resolve([])),
        recordActivity: mock(() => Promise.resolve(true)),
        updateTier: mock(() => Promise.resolve()),
        ...overrides,
    };
}

function createMockPayment(overrides?: Partial<Payment>): Payment {
    return {
        id: 'payment-123',
        userId: 'user-1',
        stripePaymentIntentId: 'pi_test_123',
        amountEur: 1000, // 10 EUR in cents
        creditsGranted: 100,
        status: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

function createMockPaymentIntent(): PaymentIntent {
    return {
        id: 'pi_test_123',
        clientSecret: 'pi_test_123_secret',
        amount: 1000,
        currency: 'eur',
        status: 'requires_payment_method',
    };
}

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

describe('PaymentService', () => {
    describe('createPaymentIntent', () => {
        test('should create payment intent and save payment record', async () => {
            const paymentRepo = createMockPaymentRepo();
            const gateway = createMockGateway();
            const idGenerator = createMockIdGenerator();
            const creditRepo = createMockCreditRepo();
            const service = new PaymentService(
                paymentRepo,
                gateway,
                idGenerator,
                creditRepo
            );

            const result = await service.createPaymentIntent({
                userId: 'user-1',
                email: 'test@example.com',
                amountEur: 1000, // 10 EUR in cents
                tier: 'free',
            });

            expect(gateway.createPaymentIntent).toHaveBeenCalledWith({
                amountEur: 1000,
                email: 'test@example.com',
                metadata: {
                    userId: 'user-1',
                    tier: 'free',
                },
            });
            expect(paymentRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user-1',
                amountEur: 1000,
                creditsGranted: 100, // 1000 cents = 10 EUR = 100 credits
                status: 'pending',
            }));
            expect(result.clientSecret).toBe('pi_test_123_secret');
        });

        test('should calculate credits correctly based on EUR amount', async () => {
            const paymentRepo = createMockPaymentRepo();
            const gateway = createMockGateway();
            const idGenerator = createMockIdGenerator();
            const creditRepo = createMockCreditRepo();
            const service = new PaymentService(
                paymentRepo,
                gateway,
                idGenerator,
                creditRepo
            );

            await service.createPaymentIntent({
                userId: 'user-1',
                email: 'test@example.com',
                amountEur: 5000, // 50 EUR in cents
                tier: 'free',
            });

            // 50 EUR * 10 credits/EUR = 500 credits
            expect(paymentRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                creditsGranted: 500,
            }));
        });
    });

    describe('handlePaymentSuccess', () => {
        test('should update payment status and add credits', async () => {
            const payment = createMockPayment({ status: 'pending' as const });
            const paymentRepo = createMockPaymentRepo({
                findByStripePaymentIntentId: mock(() => Promise.resolve(payment)),
                updateStatus: mock(() => Promise.resolve({ ...payment, status: 'completed' as const })),
            });
            const creditRepo = createMockCreditRepo();
            const gateway = createMockGateway({
                confirmPayment: mock(() => Promise.resolve(true)),
            });
            const idGenerator = createMockIdGenerator();
            const service = new PaymentService(
                paymentRepo,
                gateway,
                idGenerator,
                creditRepo
            );

            const result = await service.handlePaymentSuccess('pi_test_123');

            expect(result).toBe(true);
            expect(paymentRepo.updateStatus).toHaveBeenCalledWith(payment.id, 'completed');
            expect(creditRepo.addCredits).toHaveBeenCalledWith(
                'user-1',
                100,
                'purchase',
                'payment-123',
                'payment',
                undefined
            );
        });

        test('should return false if payment not found', async () => {
            const paymentRepo = createMockPaymentRepo({
                findByStripePaymentIntentId: mock(() => Promise.resolve(null)),
            });
            const creditRepo = createMockCreditRepo();
            const gateway = createMockGateway();
            const idGenerator = createMockIdGenerator();
            const service = new PaymentService(
                paymentRepo,
                gateway,
                idGenerator,
                creditRepo
            );

            const result = await service.handlePaymentSuccess('pi_unknown');

            expect(result).toBe(false);
        });

        test('should not add credits if payment already completed', async () => {
            const payment = createMockPayment({ status: 'completed' as const });
            const paymentRepo = createMockPaymentRepo({
                findByStripePaymentIntentId: mock(() => Promise.resolve(payment)),
            });
            const creditRepo = createMockCreditRepo();
            const gateway = createMockGateway();
            const idGenerator = createMockIdGenerator();
            const service = new PaymentService(
                paymentRepo,
                gateway,
                idGenerator,
                creditRepo
            );

            const result = await service.handlePaymentSuccess('pi_test_123');

            expect(result).toBe(true); // Already completed, return success
            expect(creditRepo.addCredits).not.toHaveBeenCalled();
        });

        test('should upgrade tier when purchasing 1000+ credits', async () => {
            const payment = createMockPayment({
                status: 'pending' as const,
                creditsGranted: 1000,
            });
            const paymentRepo = createMockPaymentRepo({
                findByStripePaymentIntentId: mock(() => Promise.resolve(payment)),
                updateStatus: mock(() => Promise.resolve({ ...payment, status: 'completed' as const })),
            });
            const balance = createMockBalance({ tier: 'free' });
            const creditRepo = createMockCreditRepo({
                getBalance: mock(() => Promise.resolve(balance)),
            });
            const gateway = createMockGateway({
                confirmPayment: mock(() => Promise.resolve(true)),
            });
            const idGenerator = createMockIdGenerator();
            const service = new PaymentService(
                paymentRepo,
                gateway,
                idGenerator,
                creditRepo
            );

            await service.handlePaymentSuccess('pi_test_123');

            expect(creditRepo.updateTier).toHaveBeenCalledWith('user-1', 'paid_tier2');
        });
    });

    describe('handleRefund', () => {
        test('should deduct credits on full refund', async () => {
            const payment = createMockPayment({
                status: 'completed' as const,
                creditsGranted: 100,
            });
            const paymentRepo = createMockPaymentRepo({
                findByStripePaymentIntentId: mock(() => Promise.resolve(payment)),
                updateStatus: mock(() => Promise.resolve({ ...payment, status: 'refunded' as const })),
            });
            const creditRepo = createMockCreditRepo();
            const gateway = createMockGateway({
                createRefund: mock(() => Promise.resolve(true)),
            });
            const idGenerator = createMockIdGenerator();
            const service = new PaymentService(
                paymentRepo,
                gateway,
                idGenerator,
                creditRepo
            );

            const result = await service.handleRefund('pi_test_123');

            expect(result).toBe(true);
            expect(creditRepo.deductCredits).toHaveBeenCalledWith(
                'user-1',
                100,
                'refund',
                'payment-123',
                'payment',
                undefined
            );
            expect(paymentRepo.updateStatus).toHaveBeenCalledWith(payment.id, 'refunded');
        });

        test('should handle partial refund', async () => {
            const payment = createMockPayment({
                status: 'completed' as const,
                creditsGranted: 100,
                amountEur: 1000, // 10 EUR
            });
            const paymentRepo = createMockPaymentRepo({
                findByStripePaymentIntentId: mock(() => Promise.resolve(payment)),
            });
            const creditRepo = createMockCreditRepo();
            const gateway = createMockGateway({
                createRefund: mock(() => Promise.resolve(true)),
            });
            const idGenerator = createMockIdGenerator();
            const service = new PaymentService(
                paymentRepo,
                gateway,
                idGenerator,
                creditRepo
            );

            // Partial refund of 500 cents (5 EUR = 50 credits)
            const result = await service.handleRefund('pi_test_123', 500);

            expect(result).toBe(true);
            expect(creditRepo.deductCredits).toHaveBeenCalledWith(
                'user-1',
                50, // 5 EUR * 10 credits/EUR
                'refund',
                'payment-123',
                'payment',
                expect.objectContaining({ partialRefund: true })
            );
        });

        test('should return false if payment not found', async () => {
            const paymentRepo = createMockPaymentRepo({
                findByStripePaymentIntentId: mock(() => Promise.resolve(null)),
            });
            const creditRepo = createMockCreditRepo();
            const gateway = createMockGateway();
            const idGenerator = createMockIdGenerator();
            const service = new PaymentService(
                paymentRepo,
                gateway,
                idGenerator,
                creditRepo
            );

            const result = await service.handleRefund('pi_unknown');

            expect(result).toBe(false);
        });
    });
});
