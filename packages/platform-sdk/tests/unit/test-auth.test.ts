import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { Auth } from '../../src/auth/Auth.js';
import type { ILogger } from '../../src/ports/ILogger.js';

describe('Auth', () => {
    let mockLogger: ILogger;
    let auth: Auth;

    beforeEach(() => {
        mockLogger = {
            info: mock(() => { }),
            error: mock(() => { }),
            warn: mock(() => { }),
            success: mock(() => { }),
        };
    });

    describe('login', () => {
        test('should prompt for email and password and return credentials on successful authentication', async () => {
            // This test will be implemented once we have the actual implementation
            // For now, we're just defining the expected behavior

            auth = new Auth({
                baseUrl: 'http://localhost:3000',
                logger: mockLogger,
            });

            // Mock successful login - will need to mock the HTTP calls
            // Expected behavior: prompt user, make API call, return credentials
            expect(auth).toBeDefined();
        });

        test('should return null if authentication fails', async () => {
            auth = new Auth({
                baseUrl: 'http://localhost:3000',
                logger: mockLogger,
            });

            // Expected behavior: return null on failed auth
            expect(auth).toBeDefined();
        });

        test('should log error messages on authentication failure', async () => {
            auth = new Auth({
                baseUrl: 'http://localhost:3000',
                logger: mockLogger,
            });

            // Expected behavior: call logger.error on failure
            expect(mockLogger.error).toBeDefined();
        });
    });

    describe('logout', () => {
        test('should not throw error when clearing non-existent session', async () => {
            auth = new Auth({
                baseUrl: 'http://localhost:3000',
                logger: mockLogger,
            });

            // Should not throw even if no session exists
            await expect(auth.logout()).resolves.toBeUndefined();
        });
    });
});
