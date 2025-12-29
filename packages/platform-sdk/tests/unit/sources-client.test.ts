import { describe, test, expect, beforeEach, mock, afterEach } from 'bun:test';
import type { ILogger } from '@platform/platform-domain';

// Store original fetch
const originalFetch = globalThis.fetch;

describe('SourcesClient', () => {
    let mockLogger: ILogger;
    let mockFetch: ReturnType<typeof mock>;

    beforeEach(() => {
        mockLogger = {
            info: mock(() => {}),
            error: mock(() => {}),
            warning: mock(() => {}),
            debug: mock(() => {}),
            await: mock(() => ({
                start: mock(() => {}),
                update: mock(() => {}),
                stop: mock(() => {}),
            })),
        };

        mockFetch = mock(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                headers: new Headers({ 'content-type': 'application/json' }),
                json: () => Promise.resolve({ items: [] }),
            } as Response)
        );
        globalThis.fetch = mockFetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    describe('readGmail', () => {
        test('should make GET request to /api/sources/gmail/read', async () => {
            const { SourcesClient } = await import('../../src/clients/SourcesClient.js');
            const client = new SourcesClient({
                baseUrl: 'http://localhost:3000',
                sessionToken: 'test-token',
                logger: mockLogger,
            });

            await client.readGmail({});

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:3000/api/sources/gmail/read',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        Cookie: 'better-auth.session_token=test-token',
                    }),
                })
            );
        });

        test('should include email query parameter when provided', async () => {
            const { SourcesClient } = await import('../../src/clients/SourcesClient.js');
            const client = new SourcesClient({
                baseUrl: 'http://localhost:3000',
                sessionToken: 'test-token',
                logger: mockLogger,
            });

            await client.readGmail({ email: 'test@example.com' });

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:3000/api/sources/gmail/read?email=test%40example.com',
                expect.anything()
            );
        });

        test('should include limitDays query parameter when provided', async () => {
            const { SourcesClient } = await import('../../src/clients/SourcesClient.js');
            const client = new SourcesClient({
                baseUrl: 'http://localhost:3000',
                sessionToken: 'test-token',
                logger: mockLogger,
            });

            await client.readGmail({ limitDays: 14 });

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:3000/api/sources/gmail/read?limitDays=14',
                expect.anything()
            );
        });

        test('should include withUrl query parameter when provided', async () => {
            const { SourcesClient } = await import('../../src/clients/SourcesClient.js');
            const client = new SourcesClient({
                baseUrl: 'http://localhost:3000',
                sessionToken: 'test-token',
                logger: mockLogger,
            });

            await client.readGmail({ withUrl: true });

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:3000/api/sources/gmail/read?withUrl=true',
                expect.anything()
            );
        });

        test('should include all query parameters when provided', async () => {
            const { SourcesClient } = await import('../../src/clients/SourcesClient.js');
            const client = new SourcesClient({
                baseUrl: 'http://localhost:3000',
                sessionToken: 'test-token',
                logger: mockLogger,
            });

            await client.readGmail({
                email: 'test@example.com',
                limitDays: 7,
                withUrl: true,
            });

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('email=test%40example.com'),
                expect.anything()
            );
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('limitDays=7'),
                expect.anything()
            );
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('withUrl=true'),
                expect.anything()
            );
        });

        test('should return items from response', async () => {
            const mockItems = [
                {
                    url: 'email-1',
                    sourceAdapter: 'Gmail',
                    tags: [],
                    summary: 'Test email',
                    rawContent: 'Email content',
                    createdAt: '2024-01-15T00:00:00.000Z',
                    updatedAt: '2024-01-15T00:00:00.000Z',
                    contentType: 'email',
                },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers({ 'content-type': 'application/json' }),
                json: () => Promise.resolve({ items: mockItems }),
            } as Response);

            const { SourcesClient } = await import('../../src/clients/SourcesClient.js');
            const client = new SourcesClient({
                baseUrl: 'http://localhost:3000',
                sessionToken: 'test-token',
                logger: mockLogger,
            });

            const result = await client.readGmail({});

            expect(result).toHaveLength(1);
            expect(result[0].rawContent).toBe('Email content');
        });

        test('should throw error when not authenticated', async () => {
            const { SourcesClient } = await import('../../src/clients/SourcesClient.js');
            const client = new SourcesClient({
                baseUrl: 'http://localhost:3000',
                logger: mockLogger,
            });

            await expect(client.readGmail({})).rejects.toThrow('Authentication required');
        });

        test('should throw error on API failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                headers: new Headers({ 'content-type': 'application/json' }),
                text: async () => 'Internal Server Error',
            } as Response);

            const { SourcesClient } = await import('../../src/clients/SourcesClient.js');
            const client = new SourcesClient({
                baseUrl: 'http://localhost:3000',
                sessionToken: 'test-token',
                logger: mockLogger,
            });

            await expect(client.readGmail({})).rejects.toThrow('API request failed');
        });
    });
});
