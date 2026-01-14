/**
 * Unit Tests: Binance Exchange Client Adapter
 * Tests the Binance API adapter implementation
 * 
 * TDD Phase: RED - Tests written before implementation
 */

import { describe, test, expect, beforeEach, mock, afterEach } from 'bun:test';
import { BinanceClient } from '../BinanceClient.js';
import type { IExchangeClient, MarketTicker, AccountBalance, MarginBalance, SymbolPrice, TradableSymbol } from '@platform/trading-domain';

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

    describe('getMarginBalances', () => {
        test('should throw error when not authenticated', async () => {
            await expect(client.getMarginBalances()).rejects.toThrow('Authentication required');
        });

        test('should fetch all margin account balances when authenticated', async () => {
            // Arrange: Mock Binance margin account response
            const mockBinanceResponse = {
                userAssets: [
                    { asset: 'BTC', free: '1.5', locked: '0.5', borrowed: '0.2', interest: '0.001', netAsset: '1.799' },
                    { asset: 'USDT', free: '10000.00', locked: '500.00', borrowed: '1000.00', interest: '5.00', netAsset: '9495.00' },
                    { asset: 'ETH', free: '5.0', locked: '0.0', borrowed: '0.0', interest: '0.0', netAsset: '5.0' },
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
            const balances: MarginBalance[] = await authenticatedClient.getMarginBalances();

            // Assert
            expect(balances).toHaveLength(3);
            expect(balances[0]).toEqual({
                asset: 'BTC',
                free: 1.5,
                locked: 0.5,
                borrowed: 0.2,
                interest: 0.001,
                netAsset: 1.799,
            });
            expect(balances[1]).toEqual({
                asset: 'USDT',
                free: 10000.0,
                locked: 500.0,
                borrowed: 1000.0,
                interest: 5.0,
                netAsset: 9495.0,
            });
        });

        test('should call margin account endpoint with signature', async () => {
            // Arrange
            const mockBinanceResponse = { userAssets: [] };

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            await authenticatedClient.getMarginBalances();

            // Assert: Verify API key header is set and correct endpoint called
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('https://api.binance.com/sapi/v1/margin/account'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-MBX-APIKEY': 'test-api-key',
                    }),
                })
            );
        });

        test('should include timestamp and signature in request', async () => {
            // Arrange
            const mockBinanceResponse = { userAssets: [] };

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            await authenticatedClient.getMarginBalances();

            // Assert: Verify URL contains timestamp and signature
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringMatching(/timestamp=\d+.*signature=[a-f0-9]+/),
                expect.anything()
            );
        });

        test('should handle margin account API errors', async () => {
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
            await expect(authenticatedClient.getMarginBalances()).rejects.toThrow('Binance API error');
        });
    });

    describe('getTickers', () => {
        test('should fetch prices for multiple symbols in a single request', async () => {
            // Arrange: Mock Binance API response for /ticker/price
            const mockBinanceResponse = [
                { symbol: 'BTCUSDT', price: '45000.50' },
                { symbol: 'ETHUSDT', price: '2500.25' },
                { symbol: 'BNBUSDT', price: '320.75' },
            ];

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            const result: SymbolPrice[] = await client.getTickers(['BTCUSDT', 'ETHUSDT', 'BNBUSDT']);

            // Assert
            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({ symbol: 'BTCUSDT', price: 45000.50 });
            expect(result[1]).toEqual({ symbol: 'ETHUSDT', price: 2500.25 });
            expect(result[2]).toEqual({ symbol: 'BNBUSDT', price: 320.75 });
        });

        test('should call correct Binance API endpoint with symbols array', async () => {
            // Arrange
            const mockBinanceResponse = [
                { symbol: 'BTCUSDT', price: '45000.00' },
            ];

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            await client.getTickers(['BTCUSDT', 'ETHUSDT']);

            // Assert: Verify correct endpoint and symbols format
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('https://api.binance.com/api/v3/ticker/price?symbols='),
                expect.objectContaining({
                    method: 'GET',
                })
            );
        });

        test('should convert symbol formats (BTC/USD -> BTCUSDT)', async () => {
            // Arrange
            const mockBinanceResponse = [
                { symbol: 'BTCUSDT', price: '45000.00' },
                { symbol: 'ETHUSDT', price: '2500.00' },
            ];

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            await client.getTickers(['BTC/USD', 'ETH/USD']);

            // Assert: Verify symbols were converted
            const fetchCall = (global.fetch as ReturnType<typeof mock>).mock.calls[0];
            const url = fetchCall[0] as string;
            expect(url).toContain('BTCUSDT');
            expect(url).toContain('ETHUSDT');
            expect(url).not.toContain('BTC/USD');
        });

        test('should fall back to individual requests on batch failure', async () => {
            // Arrange: Mock batch API error, then individual success
            let callCount = 0;
            // @ts-ignore
            global.fetch = mock(() => {
                callCount++;
                if (callCount === 1) {
                    // First call (batch) fails
                    return Promise.resolve({
                        ok: false,
                        status: 400,
                        statusText: 'Bad Request',
                        json: () => Promise.resolve({ msg: 'Invalid symbol' }),
                    } as Response);
                }
                // Individual calls succeed
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ symbol: 'BTCUSDT', price: '45000.00' }),
                } as Response);
            });

            // Act
            const result = await client.getTickers(['BTCUSDT']);

            // Assert: Should return result from fallback individual request
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({ symbol: 'BTCUSDT', price: 45000 });
        });

        test('should return empty array for empty input', async () => {
            // Arrange
            const mockBinanceResponse: Array<{ symbol: string; price: string }> = [];

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            const result = await client.getTickers([]);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('getOrders', () => {
        test('should throw error when not authenticated', async () => {
            await expect(client.getOrders()).rejects.toThrow('Authentication required');
        });

        test('should fetch open orders for a specific symbol', async () => {
            // Arrange: Mock Binance openOrders response
            const mockBinanceResponse = [
                {
                    symbol: 'BTCUSDT',
                    orderId: 12345,
                    orderListId: -1,
                    clientOrderId: 'client123',
                    price: '45000.00',
                    origQty: '0.001',
                    executedQty: '0.0',
                    cummulativeQuoteQty: '0.0',
                    status: 'NEW',
                    timeInForce: 'GTC',
                    type: 'LIMIT',
                    side: 'BUY',
                    time: 1704067200000,
                    updateTime: 1704067200000,
                },
                {
                    symbol: 'BTCUSDT',
                    orderId: 12346,
                    orderListId: -1,
                    clientOrderId: 'client124',
                    price: '50000.00',
                    origQty: '0.002',
                    executedQty: '0.001',
                    cummulativeQuoteQty: '50.0',
                    status: 'PARTIALLY_FILLED',
                    timeInForce: 'GTC',
                    type: 'LIMIT',
                    side: 'SELL',
                    time: 1704067300000,
                    updateTime: 1704067400000,
                },
            ];

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            const orders = await authenticatedClient.getOrders('BTCUSDT');

            // Assert
            expect(orders).toHaveLength(2);
            expect(orders[0]).toEqual({
                id: '12345',
                symbol: 'BTCUSDT',
                side: 'buy',
                type: 'limit',
                quantity: 0.001,
                price: 45000.0,
                status: 'pending',
                filledQuantity: 0.0,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
            });
            expect(orders[1]).toEqual({
                id: '12346',
                symbol: 'BTCUSDT',
                side: 'sell',
                type: 'limit',
                quantity: 0.002,
                price: 50000.0,
                status: 'partially_filled',
                filledQuantity: 0.001,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
            });
        });

        test('should fetch all open orders when no symbol specified', async () => {
            // Arrange: Mock Binance openOrders response
            const mockBinanceResponse = [
                {
                    symbol: 'BTCUSDT',
                    orderId: 12345,
                    orderListId: -1,
                    clientOrderId: 'client123',
                    price: '45000.00',
                    origQty: '0.001',
                    executedQty: '0.0',
                    cummulativeQuoteQty: '0.0',
                    status: 'NEW',
                    timeInForce: 'GTC',
                    type: 'LIMIT',
                    side: 'BUY',
                    time: 1704067200000,
                    updateTime: 1704067200000,
                },
                {
                    symbol: 'ETHUSDT',
                    orderId: 12347,
                    orderListId: -1,
                    clientOrderId: 'client125',
                    price: '2500.00',
                    origQty: '0.5',
                    executedQty: '0.0',
                    cummulativeQuoteQty: '0.0',
                    status: 'NEW',
                    timeInForce: 'GTC',
                    type: 'LIMIT',
                    side: 'BUY',
                    time: 1704067500000,
                    updateTime: 1704067500000,
                },
            ];

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            const orders = await authenticatedClient.getOrders();

            // Assert
            expect(orders).toHaveLength(2);
            expect(orders[0].symbol).toBe('BTCUSDT');
            expect(orders[1].symbol).toBe('ETHUSDT');
        });

        test('should call openOrders endpoint with signature', async () => {
            // Arrange
            const mockBinanceResponse: unknown[] = [];

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            await authenticatedClient.getOrders('BTCUSDT');

            // Assert: Verify API key header is set
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('https://api.binance.com/api/v3/openOrders'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-MBX-APIKEY': 'test-api-key',
                    }),
                })
            );
        });

        test('should include symbol parameter when provided', async () => {
            // Arrange
            const mockBinanceResponse: unknown[] = [];

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            await authenticatedClient.getOrders('BTCUSDT');

            // Assert: Verify URL contains symbol
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('symbol=BTCUSDT'),
                expect.anything()
            );
        });

        test('should not include symbol parameter when not provided', async () => {
            // Arrange
            const mockBinanceResponse: unknown[] = [];

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            await authenticatedClient.getOrders();

            // Assert: Verify URL does not contain symbol
            expect(global.fetch).toHaveBeenCalledWith(
                expect.not.stringContaining('symbol='),
                expect.anything()
            );
        });

        test('should include timestamp and signature in request', async () => {
            // Arrange
            const mockBinanceResponse: unknown[] = [];

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            await authenticatedClient.getOrders();

            // Assert: Verify URL contains timestamp and signature
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringMatching(/timestamp=\d+.*signature=[a-f0-9]+/),
                expect.anything()
            );
        });

        test('should handle API errors gracefully', async () => {
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
            await expect(authenticatedClient.getOrders()).rejects.toThrow('Binance API error');
        });

        test('should return empty array when no open orders exist', async () => {
            // Arrange
            const mockBinanceResponse: unknown[] = [];

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            const orders = await authenticatedClient.getOrders();

            // Assert
            expect(orders).toEqual([]);
        });

        test('should convert BTC/USD symbol format to BTCUSDT', async () => {
            // Arrange
            const mockBinanceResponse: unknown[] = [];

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            await authenticatedClient.getOrders('BTC/USD');

            // Assert: Verify symbol was converted
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('symbol=BTCUSDT'),
                expect.anything()
            );
        });
    });

    describe('getSymbols', () => {
        test('should fetch all tradable symbols from exchange info', async () => {
            // Arrange: Mock Binance exchangeInfo response
            const mockBinanceResponse = {
                symbols: [
                    { symbol: 'BTCUSDC', status: 'TRADING', baseAsset: 'BTC', quoteAsset: 'USDC', filters: [] },
                    { symbol: 'ETHUSDC', status: 'TRADING', baseAsset: 'ETH', quoteAsset: 'USDC', filters: [] },
                    { symbol: 'BTCUSDT', status: 'TRADING', baseAsset: 'BTC', quoteAsset: 'USDT', filters: [] },
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
            const result: Array<TradableSymbol> = await client.getSymbols();

            // Assert
            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({
                symbol: 'BTCUSDC',
                baseAsset: 'BTC',
                quoteAsset: 'USDC',
                status: 'TRADING',
            });
        });

        test('should filter by quoteAsset when provided', async () => {
            // Arrange: Mock Binance exchangeInfo response with multiple quote assets
            const mockBinanceResponse = {
                symbols: [
                    { symbol: 'BTCUSDC', status: 'TRADING', baseAsset: 'BTC', quoteAsset: 'USDC', filters: [] },
                    { symbol: 'ETHUSDC', status: 'TRADING', baseAsset: 'ETH', quoteAsset: 'USDC', filters: [] },
                    { symbol: 'BTCUSDT', status: 'TRADING', baseAsset: 'BTC', quoteAsset: 'USDT', filters: [] },
                    { symbol: 'ETHUSDT', status: 'TRADING', baseAsset: 'ETH', quoteAsset: 'USDT', filters: [] },
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
            const result = await client.getSymbols('USDC');

            // Assert: Should only return USDC pairs
            expect(result).toHaveLength(2);
            expect(result.every(s => s.quoteAsset === 'USDC')).toBe(true);
            expect(result.map(s => s.symbol)).toEqual(['BTCUSDC', 'ETHUSDC']);
        });

        test('should only return TRADING status symbols', async () => {
            // Arrange: Mock response with various statuses
            const mockBinanceResponse = {
                symbols: [
                    { symbol: 'BTCUSDC', status: 'TRADING', baseAsset: 'BTC', quoteAsset: 'USDC', filters: [] },
                    { symbol: 'ETHUSDC', status: 'HALT', baseAsset: 'ETH', quoteAsset: 'USDC', filters: [] },
                    { symbol: 'BNBUSDC', status: 'BREAK', baseAsset: 'BNB', quoteAsset: 'USDC', filters: [] },
                    { symbol: 'SOLUSDC', status: 'TRADING', baseAsset: 'SOL', quoteAsset: 'USDC', filters: [] },
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
            const result = await client.getSymbols();

            // Assert: Should only return TRADING symbols
            expect(result).toHaveLength(2);
            expect(result.every(s => s.status === 'TRADING')).toBe(true);
            expect(result.map(s => s.symbol)).toEqual(['BTCUSDC', 'SOLUSDC']);
        });

        test('should call correct Binance API endpoint', async () => {
            // Arrange
            const mockBinanceResponse = { symbols: [] };

            // @ts-ignore
            global.fetch = mock(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBinanceResponse),
                } as Response)
            );

            // Act
            await client.getSymbols();

            // Assert: Verify correct endpoint called
            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.binance.com/api/v3/exchangeInfo',
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
                    status: 500,
                    statusText: 'Internal Server Error',
                    json: () => Promise.resolve({ msg: 'Server error' }),
                } as Response)
            );

            // Act & Assert
            await expect(client.getSymbols()).rejects.toThrow('Binance API error');
        });

        test('should return empty array when no symbols match filter', async () => {
            // Arrange
            const mockBinanceResponse = {
                symbols: [
                    { symbol: 'BTCUSDT', status: 'TRADING', baseAsset: 'BTC', quoteAsset: 'USDT', filters: [] },
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
            const result = await client.getSymbols('USDC');

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('createOrder with margin support', () => {
        test('should throw error when not authenticated', async () => {
            await expect(client.createOrder({
                symbol: 'BTCUSDT',
                side: 'buy',
                type: 'limit',
                quantity: 0.001,
                price: 45000,
            })).rejects.toThrow('Authentication required');
        });

        test('should use spot endpoint when isMarginOrder is false', async () => {
            // Arrange: Mock exchange info for symbol filters
            const mockExchangeInfo = {
                symbols: [{
                    symbol: 'BTCUSDT',
                    status: 'TRADING',
                    baseAsset: 'BTC',
                    quoteAsset: 'USDT',
                    filters: [
                        { filterType: 'LOT_SIZE', minQty: '0.00001', maxQty: '1000', stepSize: '0.00001' },
                        { filterType: 'PRICE_FILTER', minPrice: '0.01', maxPrice: '100000', tickSize: '0.01' },
                    ],
                }],
            };

            const mockOrderResponse = {
                symbol: 'BTCUSDT',
                orderId: 12345,
                orderListId: -1,
                clientOrderId: 'client123',
                transactTime: Date.now(),
                price: '45000.00',
                origQty: '0.001',
                executedQty: '0.0',
                cummulativeQuoteQty: '0.0',
                status: 'NEW',
                timeInForce: 'GTC',
                type: 'LIMIT',
                side: 'BUY',
            };

            let callCount = 0;
            // @ts-ignore
            global.fetch = mock(() => {
                callCount++;
                if (callCount === 1) {
                    // First call: exchange info for symbol filters
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve(mockExchangeInfo),
                    } as Response);
                }
                // Second call: order placement
                return Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve(JSON.stringify(mockOrderResponse)),
                } as Response);
            });

            // Act
            await authenticatedClient.createOrder({
                symbol: 'BTCUSDT',
                side: 'buy',
                type: 'limit',
                quantity: 0.001,
                price: 45000,
                isMarginOrder: false,
            });

            // Assert: Second call should use spot endpoint
            const calls = (global.fetch as ReturnType<typeof mock>).mock.calls;
            const orderCallUrl = calls[1][0] as string;
            expect(orderCallUrl).toContain('https://api.binance.com/api/v3/order');
            expect(orderCallUrl).not.toContain('/sapi/v1/margin/order');
        });

        test('should use margin endpoint when isMarginOrder is true', async () => {
            // Arrange: Mock exchange info for symbol filters
            const mockExchangeInfo = {
                symbols: [{
                    symbol: 'BTCUSDT',
                    status: 'TRADING',
                    baseAsset: 'BTC',
                    quoteAsset: 'USDT',
                    filters: [
                        { filterType: 'LOT_SIZE', minQty: '0.00001', maxQty: '1000', stepSize: '0.00001' },
                        { filterType: 'PRICE_FILTER', minPrice: '0.01', maxPrice: '100000', tickSize: '0.01' },
                    ],
                }],
            };

            const mockOrderResponse = {
                symbol: 'BTCUSDT',
                orderId: 12345,
                orderListId: -1,
                clientOrderId: 'client123',
                transactTime: Date.now(),
                price: '45000.00',
                origQty: '0.001',
                executedQty: '0.0',
                cummulativeQuoteQty: '0.0',
                status: 'NEW',
                timeInForce: 'GTC',
                type: 'LIMIT',
                side: 'BUY',
            };

            let callCount = 0;
            // @ts-ignore
            global.fetch = mock(() => {
                callCount++;
                if (callCount === 1) {
                    // First call: exchange info for symbol filters
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve(mockExchangeInfo),
                    } as Response);
                }
                // Second call: order placement
                return Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve(JSON.stringify(mockOrderResponse)),
                } as Response);
            });

            // Act
            await authenticatedClient.createOrder({
                symbol: 'BTCUSDT',
                side: 'buy',
                type: 'limit',
                quantity: 0.001,
                price: 45000,
                isMarginOrder: true,
            });

            // Assert: Second call should use margin endpoint
            const calls = (global.fetch as ReturnType<typeof mock>).mock.calls;
            const orderCallUrl = calls[1][0] as string;
            expect(orderCallUrl).toContain('https://api.binance.com/sapi/v1/margin/order');
        });

        test('should default to spot endpoint when isMarginOrder is not specified', async () => {
            // Arrange: Mock exchange info for symbol filters
            const mockExchangeInfo = {
                symbols: [{
                    symbol: 'BTCUSDT',
                    status: 'TRADING',
                    baseAsset: 'BTC',
                    quoteAsset: 'USDT',
                    filters: [
                        { filterType: 'LOT_SIZE', minQty: '0.00001', maxQty: '1000', stepSize: '0.00001' },
                        { filterType: 'PRICE_FILTER', minPrice: '0.01', maxPrice: '100000', tickSize: '0.01' },
                    ],
                }],
            };

            const mockOrderResponse = {
                symbol: 'BTCUSDT',
                orderId: 12345,
                orderListId: -1,
                clientOrderId: 'client123',
                transactTime: Date.now(),
                price: '45000.00',
                origQty: '0.001',
                executedQty: '0.0',
                cummulativeQuoteQty: '0.0',
                status: 'NEW',
                timeInForce: 'GTC',
                type: 'LIMIT',
                side: 'BUY',
            };

            let callCount = 0;
            // @ts-ignore
            global.fetch = mock(() => {
                callCount++;
                if (callCount === 1) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve(mockExchangeInfo),
                    } as Response);
                }
                return Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve(JSON.stringify(mockOrderResponse)),
                } as Response);
            });

            // Act - isMarginOrder not specified
            await authenticatedClient.createOrder({
                symbol: 'BTCUSDT',
                side: 'buy',
                type: 'limit',
                quantity: 0.001,
                price: 45000,
            });

            // Assert: Should use spot endpoint by default
            const calls = (global.fetch as ReturnType<typeof mock>).mock.calls;
            const orderCallUrl = calls[1][0] as string;
            expect(orderCallUrl).toContain('https://api.binance.com/api/v3/order');
            expect(orderCallUrl).not.toContain('/sapi/v1/margin/order');
        });
    });
});
