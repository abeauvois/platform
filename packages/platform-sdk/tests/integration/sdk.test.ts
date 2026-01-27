import { describe, test, expect, beforeAll } from 'bun:test';
import { PlatformApiClient } from '../../src/index.js';
import { Bookmark, type ILogger } from '@abeauvois/platform-domain';
import { TEST_API_URL } from '../test-config.js';

/**
 * API Bookmark type includes server-generated fields (id is guaranteed from API)
 */
type ApiBookmark = Bookmark & { id: string };

const API_BASE_URL = TEST_API_URL;

/**
 * Check if the API server is available before running integration tests.
 * This runs synchronously at module load time so skipIf can use the result.
 */
async function checkServerAvailable(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000),
        });
        return response.ok;
    } catch {
        return false;
    }
}

// Check server availability at module load time
const serverAvailablePromise = checkServerAvailable();
let serverAvailable = false;

// Block until we know if server is available (runs before tests start)
await serverAvailablePromise.then(available => {
    serverAvailable = available;
    if (!available) {
        console.log('\n⚠️  API server not available at', API_BASE_URL);
        console.log('   Skipping integration tests. Start the server with: bun run api\n');
    }
});

/**
 * Integration test for Platform SDK
 *
 * Prerequisites:
 * 1. API server must be running at http://localhost:3000
 * 2. Test user must exist with credentials:
 *    - Email: test@example.com
 *    - Password: password123
 *
 * To start the server:
 *   bun run api
 *
 * To create test user:
 * curl -X POST http://localhost:3000/api/auth/sign-up/email \
 *   -H "Content-Type: application/json" \
 *   -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
 */

class TestLogger implements ILogger {
    info(message: string): void {
        console.log(`[INFO] ${message}`);
    }
    error(message: string): void {
        console.error(`[ERROR] ${message}`);
    }
    warning(message: string): void {
        console.warn(`[WARN] ${message}`);
    }
    debug(message: string): void {
        console.debug(`[DEBUG] ${message}`);
    }
    await(message: string) {
        return {
            start: () => console.log(`[LOADING] ${message}`),
            update: (msg: string) => console.log(`[LOADING] ${msg}`),
            stop: () => console.log(`[DONE]`),
        };
    }
}

describe.skipIf(!serverAvailable)('PlatformApiClient Integration Tests', () => {
    let client: PlatformApiClient;
    let logger: ILogger;

    beforeAll(() => {
        logger = new TestLogger();
        client = new PlatformApiClient({
            baseUrl: API_BASE_URL,
            logger,
        });
    });

    test('should create PlatformApiClient instance', () => {
        expect(client).toBeDefined();
        expect(client).toBeInstanceOf(PlatformApiClient);
    });

    test('should ingest gmail with options', async () => {
        const platformClient = new PlatformApiClient({
            baseUrl: API_BASE_URL,
            logger
        });

        await platformClient.auth.signIn({
            email: 'test@example.com',
            password: 'password123',
        });

        const preset = "gmail";

        const workflow = platformClient.workflow.create(preset, {
            filter: {
                email: "abeauvois@gmail.com"
            },
        });

        await workflow.execute({
            onStart: ({ logger }) => logger.info('started'),
            onError: ({ logger }) => logger.error('an error occured'),
            onComplete: ({ logger }) => logger.info('\n✨ Success! Your links have been extracted and categorized.\n'),
        });
    }, { timeout: 15000 })

    test('should sign in with valid credentials', async () => {
        const authResponse = await client.auth.signIn({
            email: 'test@example.com',
            password: 'password123',
        });

        expect(authResponse).toBeDefined();
        expect(authResponse.sessionToken).toBeDefined();
        expect(authResponse.userId).toBeDefined();
        expect(authResponse.email).toBe('test@example.com');
        expect(typeof authResponse.sessionToken).toBe('string');
    }, { timeout: 10000 });

    test('should fetch bookmarks with existing session', async () => {
        await client.auth.signIn({
            email: 'test@example.com',
            password: 'password123',
        });

        const bookmarks = await client.bookmarks.fetchAll();

        expect(bookmarks).toBeDefined();
        expect(Array.isArray(bookmarks)).toBe(true);

        if (bookmarks.length > 0) {
            const bookmark = bookmarks[0];
            expect(bookmark).toHaveProperty('url');
            expect(bookmark).toHaveProperty('sourceAdapter');
            expect(bookmark).toHaveProperty('tags');
            expect(typeof bookmark.url).toBe('string');
            expect(Array.isArray(bookmark.tags)).toBe(true);
        }
    }, { timeout: 10000 });

    test('should load session from file if exists', async () => {
        // Create new client with session token
        const clientWithSession = new PlatformApiClient({
            baseUrl: API_BASE_URL,
            logger,
        });

        await clientWithSession.auth.signIn({
            email: 'test@example.com',
            password: 'password123',
        });

        const bookmarks = await clientWithSession.bookmarks.fetchAll();

        expect(bookmarks).toBeDefined();
        expect(Array.isArray(bookmarks)).toBe(true);

        console.log(`✓ Successfully fetched bookmarks with saved session`);
    }, { timeout: 10000 });

    test('should create and delete a bookmark', async () => {
        await client.auth.signIn({
            email: 'test@example.com',
            password: 'password123',
        });

        const newBookmark = await client.bookmarks.create({
            url: 'https://example.com/test-' + Date.now(),
            sourceAdapter: 'Other',
            tags: ['integration-test'],
            summary: 'Test bookmark for integration tests',
        }) as ApiBookmark;

        expect(newBookmark).toBeDefined();
        expect(newBookmark.url).toContain('https://example.com/test-');
        expect(newBookmark.tags).toContain('integration-test');

        // Clean up
        await client.bookmarks.delete(newBookmark.id);
    }, { timeout: 15000 });

    test('should update a bookmark', async () => {
        await client.auth.signIn({
            email: 'test@example.com',
            password: 'password123',
        });

        const newBookmark = await client.bookmarks.create({
            url: 'https://example.com/update-test-' + Date.now(),
            sourceAdapter: 'Other',
            tags: ['original-tag'],
        }) as ApiBookmark;

        const updatedBookmark = await client.bookmarks.update(newBookmark.id, {
            tags: ['updated-tag', 'test'],
            summary: 'Updated summary',
        }) as ApiBookmark;

        expect(updatedBookmark.tags).toContain('updated-tag');
        expect(updatedBookmark.summary).toBe('Updated summary');

        // Clean up
        await client.bookmarks.delete(newBookmark.id);
    }, { timeout: 15000 });

    test('should handle authentication failure gracefully', async () => {
        const testClient = new PlatformApiClient({
            baseUrl: API_BASE_URL,
            logger,
        });

        await expect(
            testClient.auth.signIn({
                email: 'nonexistent@example.com',
                password: 'wrongpassword',
            })
        ).rejects.toThrow();
    }, { timeout: 10000 });

    test('should handle API errors gracefully when not authenticated', async () => {
        const unauthenticatedClient = new PlatformApiClient({
            baseUrl: API_BASE_URL,
            logger,
        });

        await expect(
            unauthenticatedClient.bookmarks.fetchAll()
        ).rejects.toThrow('Authentication required');
    }, { timeout: 10000 });

    test('should handle invalid session token', async () => {
        const clientWithBadToken = new PlatformApiClient({
            baseUrl: API_BASE_URL,
            sessionToken: 'invalid-token-12345',
            logger,
        });

        await expect(
            clientWithBadToken.bookmarks.fetchAll()
        ).rejects.toThrow();
    }, { timeout: 10000 });

    test('should sign out successfully', async () => {
        await client.auth.signIn({
            email: 'test@example.com',
            password: 'password123',
        });

        await client.auth.signOut();

        // Should not be able to fetch bookmarks after sign out
        await expect(
            client.bookmarks.fetchAll()
        ).rejects.toThrow('Authentication required');
    }, { timeout: 10000 });
});
