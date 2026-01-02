/**
 * Balance Routes
 * Protected endpoints for account balance operations
 */

import { Hono } from 'hono';
import { BinanceClient } from '../adapters/BinanceClient.js';
import type { HonoEnv } from '../types';
import type { IExchangeClient } from '@platform/trading-domain';

// Create authenticated exchange client using environment variables
const createAuthenticatedClient = (): IExchangeClient => {
    const apiKey = process.env.BINANCE_API_KEY;
    const apiSecret = process.env.BINANCE_API_SECRET;

    if (!apiKey || !apiSecret) {
        throw new Error('BINANCE_API_KEY and BINANCE_API_SECRET must be set in environment');
    }

    return new BinanceClient({ apiKey, apiSecret });
};

export const balance = new Hono<HonoEnv>()
    /**
     * GET /api/trading/balance
     * Get all account balances (only non-zero balances)
     */
    .get('/', async (c) => {
        try {
            const client = createAuthenticatedClient();
            const allBalances = await client.getBalances();

            // Filter to only show non-zero balances
            const nonZeroBalances = allBalances.filter(b => b.total > 0);

            return c.json({
                exchange: client.getExchangeName(),
                balances: nonZeroBalances,
                count: nonZeroBalances.length,
            });
        } catch (error) {
            console.error('Failed to fetch balances: ', error);
            const message = error instanceof Error ? error.message : 'Failed to fetch balances';
            return c.json({ error: message }, 500);
        }
    })
    /**
     * GET /api/trading/balance/:asset
     * Get balance for a specific asset
     */
    .get('/:asset', async (c) => {
        try {
            const asset = c.req.param('asset');
            const client = createAuthenticatedClient();
            const balance = await client.getBalance(asset);

            if (!balance) {
                return c.json({ error: `Asset ${asset.toUpperCase()} not found` }, 404);
            }

            return c.json({
                exchange: client.getExchangeName(),
                balance,
            });
        } catch (error) {
            console.error('Failed to fetch balance: ', error);
            const message = error instanceof Error ? error.message : 'Failed to fetch balance';
            return c.json({ error: message }, 500);
        }
    });
