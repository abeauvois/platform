/**
 * Order Stream Routes (Server-Sent Events)
 * Real-time order updates via SSE - requires user authentication
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { HonoEnv } from '../types';
import type { IExchangeClient } from '@platform/trading-domain';
import { authMiddleware } from '../middlewares/auth.middleware';

/**
 * Create SSE routes for order updates
 * @param exchangeClient - Authenticated exchange client instance
 */
export function createOrderStreamRoutes(exchangeClient: IExchangeClient) {
    const app = new Hono<HonoEnv>();

    // Require user authentication for all order stream routes
    app.use('/*', authMiddleware);

    /**
     * GET /stream - Server-Sent Events endpoint for order updates
     *
     * Streams real-time order updates from Binance user data stream
     * Client should connect with EventSource API
     * Requires authentication.
     */
    app.get('/stream', async (c) => {
        // Check if user data stream is supported
        if (!exchangeClient.supportsUserDataStream()) {
            return c.json({ error: 'User data stream not available (authentication required)' }, 503);
        }

        return streamSSE(c, async (stream) => {
            let unsubscribe: (() => void) | null = null;
            let isAborted = false;

            // Handle client disconnect
            stream.onAbort(() => {
                console.log('[OrderStream] Client disconnected');
                isAborted = true;
                if (unsubscribe) {
                    unsubscribe();
                    unsubscribe = null;
                }
            });

            try {
                // Send initial connection message
                await stream.writeSSE({
                    event: 'connected',
                    data: JSON.stringify({ message: 'Connected to order stream' }),
                });

                // Subscribe to user data events
                unsubscribe = await exchangeClient.subscribeToUserData((event) => {
                    // Only send order updates (filter out balance updates for this endpoint)
                    if (event.eventType === 'ORDER_UPDATE' && !isAborted) {
                        stream.writeSSE({
                            event: 'order_update',
                            data: JSON.stringify(event),
                        }).catch((error) => {
                            console.error('[OrderStream] Failed to write SSE:', error);
                        });
                    }
                });

                // Keep connection alive with periodic pings
                // This loop also keeps the stream function running
                while (!isAborted) {
                    await stream.writeSSE({
                        event: 'ping',
                        data: JSON.stringify({ timestamp: Date.now() }),
                    });
                    // Wait 30 seconds between pings
                    await new Promise(resolve => setTimeout(resolve, 30000));
                }
            } catch (error) {
                if (!isAborted) {
                    console.error('[OrderStream] Stream error:', error);
                }
            } finally {
                // Cleanup subscription when client disconnects
                if (unsubscribe) {
                    unsubscribe();
                }
            }
        });
    });

    return app;
}
