import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { TradingApiClient } from '../../src/TradingApiClient.js';
import type { ILogger } from '@abeauvois/platform-domain';

/**
 * Integration Test for getTicker
 * 
 * IMPORTANT: This test requires the trading server to be running on localhost:3001
 * 
 * To run this test:
 * 1. Start the server: cd apps/trading && bun run server
 * 2. Run the test: cd packages/trading-sdk && bun test tests/integration/test-ticker-integration.test.ts
 */
describe('Trading API - getTicker Integration', () => {
    let mockLogger: ILogger;
    let client: TradingApiClient;

    beforeEach(() => {
        mockLogger = {
            info: mock(() => { }),
            error: mock(() => { }),
            warning: mock(() => { }),
            debug: mock(() => { }),
            await: mock(() => ({
                start: mock(() => { }),
                update: mock(() => { }),
                stop: mock(() => { }),
            })),
        };

        // Initialize client pointing to local server
        client = new TradingApiClient({
            baseUrl: 'http://localhost:3001',
            logger: mockLogger,
        });
    });

    test('should fetch ticker data from live endpoint', async () => {
        // Act: Call getTicker method against live server
        const result = await client.getTicker();

        // Assert: Verify the response structure
        expect(result).toBeDefined();
        expect(result.symbol).toBe('BTC/USD');
        expect(result.lastPrice).toBe(45000);
        expect(result.bidPrice).toBe(44995);
        expect(result.askPrice).toBe(45005);
        expect(result.volume24h).toBe(1234.56);
        expect(result.high24h).toBe(46000);
        expect(result.low24h).toBe(44000);
        expect(result.priceChange24h).toBe(1000);
        expect(result.priceChangePercent24h).toBe(2.27);
        expect(result.timestamp).toBeInstanceOf(Date);
    });
});
