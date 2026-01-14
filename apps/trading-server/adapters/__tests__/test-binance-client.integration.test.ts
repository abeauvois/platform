/**
 * Integration Tests: Binance Exchange Client
 * Tests real API calls to Binance (requires network access)
 * 
 * These tests hit the actual Binance API and verify real data is returned.
 * Run these tests to validate the adapter works with the live API.
 */

import { describe, test, expect } from 'bun:test';
import { BinanceClient } from '../BinanceClient.js';
import type { MarketTicker } from '@platform/trading-domain';

describe('BinanceClient Integration', () => {
    const client = new BinanceClient();

    test('should fetch real BTC/USD ticker from Binance', async () => {
        // Act: Fetch real ticker data
        const ticker = await client.getTicker('BTC/USD');

        // Assert: Verify structure and realistic values
        expect(ticker.symbol).toBe('BTCUSDT');
        expect(typeof ticker.lastPrice).toBe('number');
        expect(ticker.lastPrice).toBeGreaterThan(0);
        expect(typeof ticker.bidPrice).toBe('number');
        expect(ticker.bidPrice).toBeGreaterThan(0);
        expect(typeof ticker.askPrice).toBe('number');
        expect(ticker.askPrice).toBeGreaterThan(0);
        expect(typeof ticker.volume24h).toBe('number');
        expect(ticker.volume24h).toBeGreaterThan(0);
        expect(typeof ticker.high24h).toBe('number');
        expect(ticker.high24h).toBeGreaterThan(0);
        expect(typeof ticker.low24h).toBe('number');
        expect(ticker.low24h).toBeGreaterThan(0);
        expect(typeof ticker.priceChange24h).toBe('number');
        expect(typeof ticker.priceChangePercent24h).toBe('number');
        expect(ticker.timestamp).toBeInstanceOf(Date);

        // Log the actual ticker data for verification
        console.log('\n📊 Real BTC/USDT Ticker Data:');
        console.log(`   Last Price: $${ticker.lastPrice.toLocaleString()}`);
        console.log(`   Bid: $${ticker.bidPrice.toLocaleString()}`);
        console.log(`   Ask: $${ticker.askPrice.toLocaleString()}`);
        console.log(`   24h Volume: ${ticker.volume24h.toLocaleString()} BTC`);
        console.log(`   24h High: $${ticker.high24h.toLocaleString()}`);
        console.log(`   24h Low: $${ticker.low24h.toLocaleString()}`);
        console.log(`   24h Change: ${ticker.priceChangePercent24h.toFixed(2)}%`);
    });

    test('should fetch real ETH/USD ticker from Binance', async () => {
        // Act
        const ticker = await client.getTicker('ETH/USD');

        // Assert
        expect(ticker.symbol).toBe('ETHUSDT');
        expect(ticker.lastPrice).toBeGreaterThan(0);
        expect(ticker.timestamp).toBeInstanceOf(Date);

        console.log('\n📊 Real ETH/USDT Ticker Data:');
        console.log(`   Last Price: $${ticker.lastPrice.toLocaleString()}`);
        console.log(`   24h Change: ${ticker.priceChangePercent24h.toFixed(2)}%`);
    });

    test('should fetch ticker using Binance native symbol format', async () => {
        // Act
        const ticker = await client.getTicker('BTCUSDT');

        // Assert
        expect(ticker.symbol).toBe('BTCUSDT');
        expect(ticker.lastPrice).toBeGreaterThan(0);
    });

    test('should handle invalid symbol gracefully', async () => {
        // Act & Assert
        await expect(client.getTicker('INVALID123XYZ')).rejects.toThrow('Binance API error');
    });

    test('should return exchange name', () => {
        expect(client.getExchangeName()).toBe('Binance');
    });
});
