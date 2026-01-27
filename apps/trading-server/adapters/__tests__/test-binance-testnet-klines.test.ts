/**
 * BinanceTestnetClient - Klines (Candlestick Data) Tests
 * 
 * Following TDD approach:
 * 1. Write failing tests first
 * 2. Implement minimal code to pass
 * 3. Refactor while keeping tests green
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import type { Candlestick } from '@abeauvois/platform-trading-domain';

// Import will fail initially - that's expected in TDD
import { BinanceTestnetClient } from '../BinanceTestnetClient';

describe('BinanceTestnetClient - Klines', () => {
    let client: BinanceTestnetClient;

    beforeAll(() => {
        // No auth needed for public klines endpoint
        client = new BinanceTestnetClient();
    });

    test('should fetch 1h candlesticks for BTCUSDT', async () => {
        const klines = await client.getKlines('BTCUSDT', '1h', 100);

        expect(klines).toBeArray();
        expect(klines.length).toBeGreaterThan(0);
        expect(klines.length).toBeLessThanOrEqual(100);

        // Validate first candle structure
        const firstCandle = klines[0];
        expect(firstCandle).toMatchObject({
            openTime: expect.any(Number),
            open: expect.any(Number),
            high: expect.any(Number),
            low: expect.any(Number),
            close: expect.any(Number),
            volume: expect.any(Number),
            closeTime: expect.any(Number),
        });
    });

    test('should fetch 5m candlesticks', async () => {
        const klines = await client.getKlines('BTCUSDT', '5m', 50);

        expect(klines).toBeArray();
        expect(klines.length).toBeGreaterThan(0);
        expect(klines.length).toBeLessThanOrEqual(50);
    });

    test('should fetch 1d candlesticks', async () => {
        const klines = await client.getKlines('ETHUSDT', '1d', 30);

        expect(klines).toBeArray();
        expect(klines.length).toBeGreaterThan(0);
        expect(klines.length).toBeLessThanOrEqual(30);
    });

    test('should return candlesticks in chronological order', async () => {
        const klines = await client.getKlines('BTCUSDT', '1h', 10);

        for (let i = 1; i < klines.length; i++) {
            expect(klines[i].openTime).toBeGreaterThan(klines[i - 1].openTime);
        }
    });

    test('should default to 100 candles when limit not specified', async () => {
        const klines = await client.getKlines('BTCUSDT', '1h');

        expect(klines).toBeArray();
        expect(klines.length).toBeGreaterThan(0);
        // Binance may return fewer if not enough history exists
    });

    test('should handle invalid symbol', async () => {
        await expect(
            client.getKlines('INVALIDPAIR', '1h', 10)
        ).rejects.toThrow();
    });

    test('should handle invalid interval', async () => {
        await expect(
            client.getKlines('BTCUSDT', 'invalid_interval', 10)
        ).rejects.toThrow();
    });

    test('should handle limit of 0', async () => {
        await expect(
            client.getKlines('BTCUSDT', '1h', 0)
        ).rejects.toThrow();
    });

    test('should handle negative limit', async () => {
        await expect(
            client.getKlines('BTCUSDT', '1h', -10)
        ).rejects.toThrow();
    });
});
