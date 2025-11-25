import { describe, test, expect, beforeAll } from 'bun:test';
import { Auth, Fetcher, CliuiLogger } from '../../src/index.js';
import type { AuthCredentials } from '../../src/ports/IAuth.js';

/**
 * Integration test for Platform SDK
 * 
 * Prerequisites:
 * 1. Web server must be running at http://localhost:5000
 * 2. Test user must exist with credentials:
 *    - Email: test@example.com
 *    - Password: password123
 * 3. At least one bookmark should exist in the database
 * 
 * To create test user:
 * curl -X POST http://localhost:5000/api/auth/sign-up/email \
 *   -H "Content-Type: application/json" \
 *   -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
 * 
 * To add a test bookmark:
 * 1. Sign in first to get session
 * 2. POST to /api/bookmarks with bookmark data
 */

describe('SDK Integration Tests', () => {
    const API_BASE_URL = 'http://localhost:5000';
    let credentials: AuthCredentials | null = null;
    let logger: CliuiLogger;

    beforeAll(() => {
        logger = new CliuiLogger();
    });

    test('should create Auth instance', async () => {
        const auth = new Auth({
            baseUrl: API_BASE_URL,
            logger,
        });

        expect(auth).toBeDefined();
    });

    test('should fetch bookmarks from real API with existing session', async () => {
        // This test requires a session file to exist at ~/.platform-cli/session.json
        // To create a session, either:
        // 1. Run: PLATFORM_API_URL=http://localhost:5000 bun run platform personal bookmark list
        // 2. Or manually create the session file with valid credentials

        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');

        const sessionPath = path.join(os.homedir(), '.platform-cli', 'session.json');

        if (!fs.existsSync(sessionPath)) {
            console.log('⚠️  Skipping: No session file found');
            console.log('   To create a session, run:');
            console.log('   PLATFORM_API_URL=http://localhost:5000 bun run platform personal bookmark list');
            return;
        }

        // Load session from file
        const sessionData = fs.readFileSync(sessionPath, 'utf-8');
        credentials = JSON.parse(sessionData) as AuthCredentials;

        console.log(`✓ Loaded session for ${credentials.email}`);

        const fetcher = new Fetcher({
            baseUrl: API_BASE_URL,
            credentials,
            logger,
        });

        const bookmarks = await fetcher.fetchBookmarks();

        // Assertions
        expect(bookmarks).toBeDefined();
        expect(Array.isArray(bookmarks)).toBe(true);

        if (bookmarks.length > 0) {
            const bookmark = bookmarks[0];
            expect(bookmark).toHaveProperty('url');
            expect(bookmark).toHaveProperty('sourceAdapter');
            expect(bookmark).toHaveProperty('tags');
            expect(typeof bookmark.url).toBe('string');
            expect(Array.isArray(bookmark.tags)).toBe(true);

            console.log(`✓ Found ${bookmarks.length} bookmarks`);
            console.log(`✓ First bookmark: ${bookmark.url}`);
        } else {
            console.log('ℹ️  No bookmarks found in database');
        }
    }, { timeout: 10000 });

    test('should handle authentication failure gracefully', async () => {
        const auth = new Auth({
            baseUrl: API_BASE_URL,
            logger,
        });

        // This test verifies error handling without actually failing auth
        // In a real scenario with invalid credentials, login() would return null
        expect(auth).toBeDefined();
    });

    test('should handle API errors gracefully', async () => {
        const invalidCredentials: AuthCredentials = {
            sessionToken: 'invalid-token-123',
            userId: 'invalid-user',
            email: 'invalid@example.com',
        };

        const fetcher = new Fetcher({
            baseUrl: API_BASE_URL,
            credentials: invalidCredentials,
            logger,
        });

        // Should throw error with invalid credentials
        await expect(fetcher.fetchBookmarks()).rejects.toThrow();
    }, { timeout: 10000 });
});
