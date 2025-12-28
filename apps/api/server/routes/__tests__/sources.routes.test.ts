/**
 * Unit Tests: Sources Routes
 * Tests the direct source reading endpoints
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { Hono } from 'hono';
import type { BaseContent } from '@platform/platform-domain';

// Mock the GmailSourceReader module
const mockRead = mock<() => Promise<BaseContent[]>>(() => Promise.resolve([]));

mock.module('../../infrastructure/source-readers/GmailSourceReader', () => ({
    createGmailSourceReader: () => ({
        read: mockRead,
    }),
}));

// Mock auth middleware to bypass database dependency
mock.module('@/middlewares/auth.middleware', () => ({
    authMiddleware: async (c: any, next: any) => {
        c.set('user', { id: 'test-user-id', email: 'test@example.com' });
        await next();
    },
}));

// Import after mocking
const { sources } = await import('../sources.routes');

describe('Sources Routes', () => {
    let app: Hono;

    beforeEach(() => {
        app = new Hono();
        // Mock auth middleware - inject user into context
        app.use('*', async (c, next) => {
            c.set('user', { id: 'test-user-id', email: 'test@example.com' });
            await next();
        });
        app.route('/api/sources', sources);
        mockRead.mockReset();
    });

    describe('GET /api/sources/gmail/read', () => {
        test('should return empty array when no messages found', async () => {
            mockRead.mockResolvedValueOnce([]);

            const res = await app.request('/api/sources/gmail/read');

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.items).toEqual([]);
        });

        test('should return BaseContent items from source reader', async () => {
            const mockItems: BaseContent[] = [
                {
                    url: 'email-1',
                    sourceAdapter: 'Gmail',
                    tags: [],
                    summary: 'Test email',
                    rawContent: 'Email content here',
                    createdAt: new Date('2024-01-15'),
                    updatedAt: new Date('2024-01-15'),
                    contentType: 'email',
                } as unknown as BaseContent,
            ];
            mockRead.mockResolvedValueOnce(mockItems);

            const res = await app.request('/api/sources/gmail/read');

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.items).toHaveLength(1);
            expect(body.items[0].rawContent).toBe('Email content here');
        });

        test('should pass email filter to source reader', async () => {
            mockRead.mockResolvedValueOnce([]);

            await app.request('/api/sources/gmail/read?email=filter@example.com');

            expect(mockRead).toHaveBeenCalledWith(
                expect.objectContaining({
                    filter: expect.objectContaining({
                        email: 'filter@example.com',
                    }),
                })
            );
        });

        test('should pass limitDays filter to source reader', async () => {
            mockRead.mockResolvedValueOnce([]);

            await app.request('/api/sources/gmail/read?limitDays=14');

            expect(mockRead).toHaveBeenCalledWith(
                expect.objectContaining({
                    filter: expect.objectContaining({
                        limitDays: 14,
                    }),
                })
            );
        });

        test('should pass withUrl filter to source reader', async () => {
            mockRead.mockResolvedValueOnce([]);

            await app.request('/api/sources/gmail/read?withUrl=true');

            expect(mockRead).toHaveBeenCalledWith(
                expect.objectContaining({
                    filter: expect.objectContaining({
                        withUrl: true,
                    }),
                })
            );
        });

        test('should handle all filters together', async () => {
            mockRead.mockResolvedValueOnce([]);

            await app.request('/api/sources/gmail/read?email=test@example.com&limitDays=7&withUrl=true');

            expect(mockRead).toHaveBeenCalledWith({
                filter: {
                    email: 'test@example.com',
                    limitDays: 7,
                    withUrl: true,
                },
            });
        });

        test('should return 500 when source reader fails', async () => {
            mockRead.mockRejectedValueOnce(new Error('Gmail API error'));

            const res = await app.request('/api/sources/gmail/read');

            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body.error).toContain('Gmail API error');
        });

        test('should return 503 when Gmail credentials not configured', async () => {
            // Re-mock to return undefined (no credentials)
            mock.module('../../infrastructure/source-readers/GmailSourceReader', () => ({
                createGmailSourceReader: () => undefined,
            }));

            // Need to re-import to get the new mock
            const { sources: sourcesNoCredentials } = await import('../sources.routes');
            const appNoCredentials = new Hono();
            appNoCredentials.use('*', async (c, next) => {
                c.set('user', { id: 'test-user-id', email: 'test@example.com' });
                await next();
            });
            appNoCredentials.route('/api/sources', sourcesNoCredentials);

            const res = await appNoCredentials.request('/api/sources/gmail/read');

            expect(res.status).toBe(503);
            const body = await res.json();
            expect(body.error).toContain('Gmail source not configured');
        });
    });
});
