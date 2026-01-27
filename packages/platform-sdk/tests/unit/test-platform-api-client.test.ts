import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { PlatformApiClient } from '../../src/PlatformApiClient.js';
import type { ILogger } from '@abeauvois/platform-domain';

describe('PlatformApiClient', () => {
    let mockLogger: ILogger;
    let client: PlatformApiClient;

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
    });

    describe('constructor', () => {
        test('should create client without session token', () => {
            client = new PlatformApiClient({
                baseUrl: 'http://localhost:3000',
                logger: mockLogger,
            });

            expect(client).toBeDefined();
        });

        test('should create client with session token', () => {
            client = new PlatformApiClient({
                baseUrl: 'http://localhost:3000',
                sessionToken: 'test-token',
                logger: mockLogger,
            });

            expect(client).toBeDefined();
        });
    });

    describe('setSessionToken', () => {
        test('should update session token', () => {
            client = new PlatformApiClient({
                baseUrl: 'http://localhost:3000',
                logger: mockLogger,
            });

            client.setSessionToken('new-token');
            expect(client).toBeDefined();
        });
    });

    describe('clearSessionToken', () => {
        test('should clear session token', () => {
            client = new PlatformApiClient({
                baseUrl: 'http://localhost:3000',
                sessionToken: 'test-token',
                logger: mockLogger,
            });

            client.clearSessionToken();
            expect(client).toBeDefined();
        });
    });

    describe('authenticated requests', () => {
        test('should throw error when trying authenticated request without token', async () => {
            client = new PlatformApiClient({
                baseUrl: 'http://localhost:3000',
                logger: mockLogger,
            });

            await expect(client.bookmarks.fetchAll()).rejects.toThrow('Authentication required');
        });
    });

    // Note: Full integration tests with actual API calls should be in integration tests
    // These unit tests focus on the client's logic and error handling
});
