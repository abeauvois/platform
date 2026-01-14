import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { BinanceClient } from './BinanceClient'

/**
 * Tests for BinanceClient margin order sideEffectType
 *
 * Regression test for: Margin orders failing with "insufficient balance"
 * when user has borrowable funds available.
 *
 * Root cause: Margin orders were sent without sideEffectType parameter,
 * causing Binance to default to NO_SIDE_EFFECT (no auto-borrow).
 *
 * Fix: Add sideEffectType=MARGIN_BUY for margin orders to enable auto-borrow.
 */
describe('BinanceClient', () => {
    let client: BinanceClient
    let fetchSpy: ReturnType<typeof spyOn>
    let capturedUrl: string | null = null

    beforeEach(() => {
        // Create authenticated client
        client = new BinanceClient({
            apiKey: 'test-api-key',
            apiSecret: 'test-api-secret',
        })

        // Mock fetch to capture request parameters
        const mockFetch = async (url: string | URL | Request) => {
            capturedUrl = url.toString()
            return new Response(JSON.stringify({
                symbol: 'BERAUSDC',
                orderId: 12345,
                clientOrderId: 'test-client-order-id',
                transactTime: Date.now(),
                price: '0.80',
                origQty: '500',
                executedQty: '0',
                cummulativeQuoteQty: '0',
                status: 'NEW',
                timeInForce: 'GTC',
                type: 'LIMIT',
                side: 'BUY',
            }), { status: 200 })
        }
        fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(mockFetch as typeof fetch)

        // Mock getSymbolFilterInfo to avoid external API calls
        spyOn(client, 'getSymbolFilterInfo').mockResolvedValue({
            stepSize: 1,
            tickSize: 0.0001,
            minQty: 1,
            maxQty: 1000000,
            minPrice: 0.0001,
            maxPrice: 100000,
        })
    })

    afterEach(() => {
        fetchSpy.mockRestore()
        capturedUrl = null
    })

    describe('createOrder - margin sideEffectType', () => {
        it('should include sideEffectType=MARGIN_BUY for margin orders', async () => {
            await client.createOrder({
                symbol: 'BERA/USDC',
                side: 'buy',
                type: 'limit',
                quantity: 500,
                price: 0.80,
                isMarginOrder: true,
            })

            expect(capturedUrl).not.toBeNull()
            expect(capturedUrl).toContain('sideEffectType=MARGIN_BUY')
        })

        it('should NOT include sideEffectType for spot orders', async () => {
            await client.createOrder({
                symbol: 'BERA/USDC',
                side: 'buy',
                type: 'limit',
                quantity: 500,
                price: 0.80,
                isMarginOrder: false,
            })

            expect(capturedUrl).not.toBeNull()
            expect(capturedUrl).not.toContain('sideEffectType')
        })

        it('should NOT include sideEffectType when isMarginOrder is undefined (defaults to spot)', async () => {
            await client.createOrder({
                symbol: 'BERA/USDC',
                side: 'buy',
                type: 'limit',
                quantity: 500,
                price: 0.80,
            })

            expect(capturedUrl).not.toBeNull()
            expect(capturedUrl).not.toContain('sideEffectType')
        })

        it('should use custom sideEffectType when provided for margin orders', async () => {
            await client.createOrder({
                symbol: 'BERA/USDC',
                side: 'buy',
                type: 'limit',
                quantity: 500,
                price: 0.80,
                isMarginOrder: true,
                sideEffectType: 'AUTO_BORROW_REPAY',
            })

            expect(capturedUrl).not.toBeNull()
            expect(capturedUrl).toContain('sideEffectType=AUTO_BORROW_REPAY')
            expect(capturedUrl).not.toContain('sideEffectType=MARGIN_BUY')
        })

        it('should use NO_SIDE_EFFECT when explicitly specified for margin orders', async () => {
            await client.createOrder({
                symbol: 'BERA/USDC',
                side: 'sell',
                type: 'limit',
                quantity: 100,
                price: 0.85,
                isMarginOrder: true,
                sideEffectType: 'NO_SIDE_EFFECT',
            })

            expect(capturedUrl).not.toBeNull()
            expect(capturedUrl).toContain('sideEffectType=NO_SIDE_EFFECT')
        })

        it('should use margin endpoint for margin orders', async () => {
            await client.createOrder({
                symbol: 'BERA/USDC',
                side: 'buy',
                type: 'limit',
                quantity: 500,
                price: 0.80,
                isMarginOrder: true,
            })

            expect(capturedUrl).not.toBeNull()
            expect(capturedUrl).toContain('/sapi/v1/margin/order')
        })

        it('should use spot endpoint for spot orders', async () => {
            await client.createOrder({
                symbol: 'BERA/USDC',
                side: 'buy',
                type: 'limit',
                quantity: 500,
                price: 0.80,
                isMarginOrder: false,
            })

            expect(capturedUrl).not.toBeNull()
            expect(capturedUrl).toContain('/api/v3/order')
            expect(capturedUrl).not.toContain('/margin/')
        })
    })
})
