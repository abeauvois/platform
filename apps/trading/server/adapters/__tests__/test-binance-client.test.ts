/**
 * Unit Tests: Binance Exchange Client Adapter
 * Tests the Binance API adapter implementation
 * 
 * TDD Phase: RED - Tests written before implementation
 */

import { describe, test, expect, beforeEach, mock, afterEach } from 'bun:test';
import { BinanceClient } from '../BinanceClient.js';
import type { IExchangeClient, MarketTicker, AccountBalance } from '@platform/trading-domain';

describe('BinanceClient', () => {
    let client: BinanceClient;
    let authenticatedClient: BinanceClient;
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
        originalFetch = global.fetch;
        // Unauthenticated client for public endpoints
        client = new BinanceClient();
        // Authenticated client for private endpoints
        authenticatedClient = new BinanceClient({
            apiKey: 'test-api-key',
            apiSecret: 'test-api-secret',
        });
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    describe('Interface Implementation', () => {
        test('should implement IExchangeClient interface', () => {
            // Verify client has required methods
            expect(typeof client.getTicker).toBe('function');
            expect(typeof client.getExchangeName).toBe('function');
        });

        test('should return "Binance" as exchange name', () => {
            expect(client.getExchangeName()).toBe('Binance');
        });
    });

    describe('getTicker', () => {
        test('should fetch ticker data for BTCUSDT', async () => {
            // Arrange: Mock Binance API response
            const mockBinanceResponse = {
                symbol: 'BTCUSDT',
                lastPrice: '45000.50',
                bidPrice: '44995.00',
                askPrice: '45005.00',
                volume: '12345.678',
                highPrice: '46000.00',
                lowPrice: '44000.00',
                priceChange: '1000.50',
                priceChangePercent: '2.27',
            };

            // @ts-ignore - Mock global fetch
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            const result = await client.getTicker('BTCUSDT');

            // Assert: Verify result matches MarketTicker interface
            expect(result.symbol).toBe('BTCUSDT');
            expect(result.lastPrice).toBe(45000.50);
            expect(result.bidPrice).toBe(44995.00);
            expect(result.askPrice).toBe(45005.00);
            expect(result.volume24h).toBe(12345.678);
            expect(result.high24h).toBe(46000.00);
            expect(result.low24h).toBe(44000.00);
            expect(result.priceChange24h).toBe(1000.50);
            expect(result.priceChangePercent24h).toBe(2.27);
            expect(result.timestamp).toBeInstanceOf(Date);
        });

        test('should convert BTC/USD symbol to BTCUSDT for Binance API', async () => {
            // Arrange
            const mockBinanceResponse = {
                symbol: 'BTCUSDT',
                lastPrice: '45000.00',
                bidPrice: '44995.00',
                askPrice: '45005.00',
                volume: '12345.678',
                highPrice: '46000.00',
                lowPrice: '44000.00',
                priceChange: '1000.00',
                priceChangePercent: '2.27',
            };

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            await client.getTicker('BTC/USD');

            // Assert: Verify API was called with converted symbol
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('symbol=BTCUSDT'),
                expect.anything()
            );
        });

        test('should call correct Binance API endpoint', async () => {
            // Arrange
            const mockBinanceResponse = {
                symbol: 'BTCUSDT',
                lastPrice: '45000.00',
                bidPrice: '44995.00',
                askPrice: '45005.00',
                volume: '12345.678',
                highPrice: '46000.00',
                lowPrice: '44000.00',
                priceChange: '1000.00',
                priceChangePercent: '2.27',
            };

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            await client.getTicker('BTCUSDT');

            // Assert: Verify correct endpoint called
            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT',
                expect.objectContaining({
                    method: 'GET',
                })
            );
        });

        test('should handle API errors gracefully', async () => {
            // Arrange: Mock API error
            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: false,
                    status: 400,
                    statusText: 'Bad Request',
                    json: () => Promise.resolve({ msg: 'Invalid symbol' }),
                } as Response)
            );

            // Act & Assert
            await expect(client.getTicker('INVALID')).rejects.toThrow('Binance API error');
        });

        test('should handle network errors', async () => {
            // Arrange: Mock network error
            // @ts-ignore
            global.fetch = mock(() => Promise.reject(new Error('Network error')));

            // Act & Assert
            await expect(client.getTicker('BTCUSDT')).rejects.toThrow('Network error');
        });

        test('should handle invalid JSON response', async () => {
            // Arrange: Mock invalid JSON
            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.reject(new Error('Invalid JSON')),
                } as Response)
            );

            // Act & Assert
            await expect(client.getTicker('BTCUSDT')).rejects.toThrow();
        });
    });

    describe('Symbol Mapping', () => {
        test('should map ETH/USD to ETHUSDT', async () => {
            // Arrange
            const mockResponse = {
                symbol: 'ETHUSDT',
                lastPrice: '2500.00',
                bidPrice: '2499.00',
                askPrice: '2501.00',
                volume: '50000.00',
                highPrice: '2600.00',
                lowPrice: '2400.00',
                priceChange: '50.00',
                priceChangePercent: '2.04',
            };

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponse),
                } as Response)
            );

            // Act
            await client.getTicker('ETH/USD');

            // Assert
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('symbol=ETHUSDT'),
                expect.anything()
            );
        });

        test('should pass through already formatted symbols', async () => {
            // Arrange
            const mockResponse = {
                symbol: 'BTCUSDT',
                lastPrice: '45000.00',
                bidPrice: '44995.00',
                askPrice: '45005.00',
                volume: '12345.00',
                highPrice: '46000.00',
                lowPrice: '44000.00',
                priceChange: '1000.00',
                priceChangePercent: '2.27',
            };

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponse),
                } as Response)
            );

            // Act
            await client.getTicker('BTCUSDT');

            // Assert
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('symbol=BTCUSDT'),
                expect.anything()
            );
        });
    });

    describe('Authentication', () => {
        test('should report unauthenticated when no credentials provided', () => {
            expect(client.isAuthenticated()).toBe(false);
        });

        test('should report authenticated when credentials provided', () => {
            expect(authenticatedClient.isAuthenticated()).toBe(true);
        });
    });

    describe('getBalances', () => {
        test('should throw error when not authenticated', async () => {
            await expect(client.getBalances()).rejects.toThrow('Authentication required');
        });

        test('should fetch all account balances when authenticated', async () => {
            // Arrange: Mock Binance account response
            const mockBinanceResponse = {
                balances: [
                    { asset: 'BTC', free: '1.5', locked: '0.5' },
                    { asset: 'USDT', free: '10000.00', locked: '500.00' },
                    { asset: 'ETH', free: '5.0', locked: '0.0' },
                ],
            };

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            const balances = await authenticatedClient.getBalances();

            // Assert
            expect(balances).toHaveLength(3);
            expect(balances[0]).toEqual({
                asset: 'BTC',
                free: 1.5,
                locked: 0.5,
                total: 2.0,
            });
            expect(balances[1]).toEqual({
                asset: 'USDT',
                free: 10000.0,
                locked: 500.0,
                total: 10500.0,
            });
        });

        test('should call account endpoint with signature', async () => {
            // Arrange
            const mockBinanceResponse = { balances: [] };

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            await authenticatedClient.getBalances();

            // Assert: Verify API key header is set
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('https://api.binance.com/api/v3/account'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-MBX-APIKEY': 'test-api-key',
                    }),
                })
            );
        });

        test('should include timestamp and signature in request', async () => {
            // Arrange
            const mockBinanceResponse = { balances: [] };

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            await authenticatedClient.getBalances();

            // Assert: Verify URL contains timestamp and signature
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringMatching(/timestamp=\d+.*signature=[a-f0-9]+/),
                expect.anything()
            );
        });

        test('should handle authentication errors', async () => {
            // Arrange: Mock auth error
            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: false,
                    status: 401,
                    statusText: 'Unauthorized',
                    json: () => Promise.resolve({ msg: 'Invalid API-key' }),
                } as Response)
            );

            // Act & Assert
            await expect(authenticatedClient.getBalances()).rejects.toThrow('Binance API error');
        });
    });

    describe('getBalance', () => {
        test('should throw error when not authenticated', async () => {
            await expect(client.getBalance('BTC')).rejects.toThrow('Authentication required');
        });

        test('should return balance for specific asset', async () => {
            // Arrange
            const mockBinanceResponse = {
                balances: [
                    { asset: 'BTC', free: '1.5', locked: '0.5' },
                    { asset: 'USDT', free: '10000.00', locked: '500.00' },
                ],
            };

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            const balance = await authenticatedClient.getBalance('BTC');

            // Assert
            expect(balance).toEqual({
                asset: 'BTC',
                free: 1.5,
                locked: 0.5,
                total: 2.0,
            });
        });

        test('should return null for non-existent asset', async () => {
            // Arrange
            const mockBinanceResponse = {
                balances: [
                    { asset: 'BTC', free: '1.5', locked: '0.5' },
                ],
            };

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            const balance = await authenticatedClient.getBalance('DOGE');

            // Assert
            expect(balance).toBeNull();
        });

        test('should be case-insensitive for asset lookup', async () => {
            // Arrange
            const mockBinanceResponse = {
                balances: [
                    { asset: 'BTC', free: '1.5', locked: '0.5' },
                ],
            };

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            const balance = await authenticatedClient.getBalance('btc');

            // Assert
            expect(balance?.asset).toBe('BTC');
        });
    });
});
