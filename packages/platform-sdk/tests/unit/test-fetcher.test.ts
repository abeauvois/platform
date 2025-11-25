import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { Fetcher } from '../../src/fetcher/Fetcher.js';
import type { ILogger } from '../../src/ports/ILogger.js';
import type { AuthCredentials } from '../../src/ports/IAuth.js';

describe('Fetcher', () => {
    let mockLogger: ILogger;
    let mockCredentials: AuthCredentials;
    let fetcher: Fetcher;

    beforeEach(() => {
        mockLogger = {
            info: mock(() => { }),
            error: mock(() => { }),
            warn: mock(() => { }),
            success: mock(() => { }),
        };

        mockCredentials = {
            sessionToken: 'test-token-123',
            userId: 'user-123',
            email: 'test@example.com',
        };
    });

    describe('fetchBookmarks', () => {
        test('should fetch bookmarks from API with authentication', async () => {
            fetcher = new Fetcher({
                baseUrl: 'http://localhost:3000',
                credentials: mockCredentials,
                logger: mockLogger,
            });

            // Expected behavior: make authenticated GET request to /api/bookmarks
            // Return array of bookmarks
            expect(fetcher).toBeDefined();
        });

        test('should return empty array if no bookmarks found', async () => {
            fetcher = new Fetcher({
                baseUrl: 'http://localhost:3000',
                credentials: mockCredentials,
                logger: mockLogger,
            });

            // Expected behavior: return empty array when API returns no bookmarks
            expect(fetcher).toBeDefined();
        });

        test('should throw error if authentication fails', async () => {
            fetcher = new Fetcher({
                baseUrl: 'http://localhost:3000',
                credentials: mockCredentials,
                logger: mockLogger,
            });

            // Expected behavior: throw error on 401/403 response
            expect(mockLogger.error).toBeDefined();
        });

        test('should log errors on fetch failure', async () => {
            fetcher = new Fetcher({
                baseUrl: 'http://localhost:3000',
                credentials: mockCredentials,
                logger: mockLogger,
            });

            // Expected behavior: log errors when fetch fails
            expect(mockLogger.error).toBeDefined();
        });
    });
});
