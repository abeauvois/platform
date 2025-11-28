import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { BinanceClient } from '../adapters/BinanceClient.js';
import type { IExchangeClient } from '@platform/trading-domain';

// Create exchange client instance (can be swapped for different exchanges)
const exchangeClient: IExchangeClient = new BinanceClient();

export const ticker = new Hono<HonoEnv>()
    .get('/', async (c) => {
        try {
            // Fetch real ticker data from Binance
            const symbol = c.req.query('symbol') || 'BTC/USD';
            const ticker = await exchangeClient.getTicker(symbol);

            return c.json(ticker);
        } catch (error) {
            console.error('Failed to fetch ticker: ', error);
            return c.json({ error: 'Failed to fetch ticker' }, 500);
        }
    });
