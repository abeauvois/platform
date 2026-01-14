/**
 * Integration Tests: Binance Balance Endpoint
 * Tests real API calls to Binance for account balance (requires valid API credentials)
 * 
 * IMPORTANT: These tests require valid BINANCE_API_KEY and BINANCE_API_SECRET
 * environment variables to be set. The tests will skip if credentials are not available.
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { BinanceClient } from '../BinanceClient.js';
import type { AccountBalance } from '@platform/trading-domain';

describe('BinanceClient Balance Integration', () => {
    let client: BinanceClient;
    let hasCredentials: boolean;

    beforeAll(() => {
        const apiKey = process.env.BINANCE_API_KEY;
        const apiSecret = process.env.BINANCE_API_SECRET;

        hasCredentials = !!(apiKey && apiSecret);

        if (hasCredentials) {
            client = new BinanceClient({ apiKey, apiSecret });
        } else {
            console.warn('⚠️ BINANCE_API_KEY and/or BINANCE_API_SECRET not set. Skipping integration tests.');
        }
    });

    test('should be authenticated when credentials are provided', () => {
        if (!hasCredentials) {
            console.log('⏭️ Skipping test: No credentials');
            return;
        }

        expect(client.isAuthenticated()).toBe(true);
    });

    test('should fetch real account balances from Binance', async () => {
        if (!hasCredentials) {
            console.log('⏭️ Skipping test: No credentials');
            return;
        }

        try {
            // Act: Fetch real balances
            const balances = await client.getBalances();

            // Assert: Verify we got an array of balances
            expect(Array.isArray(balances)).toBe(true);
            expect(balances.length).toBeGreaterThan(0);

            // Verify balance structure
            const firstBalance = balances[0];
            expect(firstBalance).toHaveProperty('asset');
            expect(firstBalance).toHaveProperty('free');
            expect(firstBalance).toHaveProperty('locked');
            expect(firstBalance).toHaveProperty('total');
            expect(typeof firstBalance.asset).toBe('string');
            expect(typeof firstBalance.free).toBe('number');
            expect(typeof firstBalance.locked).toBe('number');
            expect(typeof firstBalance.total).toBe('number');

            // Log summary
            const nonZeroBalances = balances.filter(b => b.total > 0);
            console.log('\n💰 Account Balance Summary:');
            console.log(`   Total assets: ${balances.length}`);
            console.log(`   Non-zero balances: ${nonZeroBalances.length}`);

            if (nonZeroBalances.length > 0) {
                console.log('\n   Non-zero balances:');
                nonZeroBalances.forEach(b => {
                    console.log(`   - ${b.asset}: ${b.total.toFixed(8)} (free: ${b.free.toFixed(8)}, locked: ${b.locked.toFixed(8)})`);
                });
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('permissions')) {
                console.log('\n⚠️ API key does not have required permissions. Enable "Read Info" in Binance API settings.');
                console.log('   Also ensure your IP is whitelisted if IP restrictions are enabled.');
                return; // Skip test gracefully
            }
            throw error;
        }
    });

    test('should fetch specific asset balance (USDT)', async () => {
        if (!hasCredentials) {
            console.log('⏭️ Skipping test: No credentials');
            return;
        }

        try {
            // Act: Fetch USDT balance
            const balance = await client.getBalance('USDT');

            // Assert: USDT should exist (it's a common trading pair)
            if (balance) {
                console.log(`\n💵 USDT Balance: ${balance.total.toFixed(2)}`);
                expect(balance.asset).toBe('USDT');
                expect(typeof balance.free).toBe('number');
                expect(typeof balance.locked).toBe('number');
                expect(balance.total).toBe(balance.free + balance.locked);
            } else {
                console.log('\n⚠️ USDT balance not found (account may not hold USDT)');
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('permissions')) {
                console.log('\n⚠️ API key permission issue - skipping test');
                return;
            }
            throw error;
        }
    });

    test('should fetch BTC balance if available', async () => {
        if (!hasCredentials) {
            console.log('⏭️ Skipping test: No credentials');
            return;
        }

        try {
            // Act: Fetch BTC balance
            const balance = await client.getBalance('BTC');

            // Assert: Log the result
            if (balance) {
                console.log(`\n₿ BTC Balance: ${balance.total.toFixed(8)} BTC`);
                expect(balance.asset).toBe('BTC');
            } else {
                console.log('\n⚠️ BTC balance not found (account may not hold BTC)');
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('permissions')) {
                console.log('\n⚠️ API key permission issue - skipping test');
                return;
            }
            throw error;
        }
    });

    test('should handle non-existent asset gracefully', async () => {
        if (!hasCredentials) {
            console.log('⏭️ Skipping test: No credentials');
            return;
        }

        try {
            // Act: Try to fetch a non-existent asset
            const balance = await client.getBalance('NOTAREALCOIN123');

            // Assert: Should return null
            expect(balance).toBeNull();
        } catch (error) {
            if (error instanceof Error && error.message.includes('permissions')) {
                console.log('\n⚠️ API key permission issue - skipping test');
                return;
            }
            throw error;
        }
    });

    test('should be case-insensitive for asset lookup', async () => {
        if (!hasCredentials) {
            console.log('⏭️ Skipping test: No credentials');
            return;
        }

        try {
            // Act: Fetch with lowercase
            const balanceLower = await client.getBalance('usdt');
            const balanceUpper = await client.getBalance('USDT');

            // Assert: Both should return the same result (or both null)
            if (balanceLower && balanceUpper) {
                expect(balanceLower.asset).toBe(balanceUpper.asset);
                expect(balanceLower.total).toBe(balanceUpper.total);
            } else {
                // If USDT doesn't exist, both should be null
                expect(balanceLower).toBe(balanceUpper);
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('permissions')) {
                console.log('\n⚠️ API key permission issue - skipping test');
                return;
            }
            throw error;
        }
    });
});
