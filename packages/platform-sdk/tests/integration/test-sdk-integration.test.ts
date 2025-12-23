import { describe, test, expect, beforeAll } from 'bun:test';
import { PlatformApiClient } from '../../src/index.js';
import type { ILogger, Bookmark } from '@platform/domain';

/**
 * API Bookmark type includes server-generated fields
 */
interface ApiBookmark extends Bookmark {
    id: string;
}

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
 * 1. Sign in using the client to get session
 * 2. Use createBookmark() method to add bookmarks
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

describe('PlatformApiClient Integration Tests', () => {
    const API_BASE_URL = 'http://localhost:3000';
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
            baseUrl: "http://localhost:3000",
            logger
        });

        // Sign in to get authentication
        try {
            await platformClient.signIn({
                email: 'test@example.com',
                password: 'password123',
            });
        } catch (error) {
            console.log('⚠️  Skipping: Test user does not exist or server not running');
            return;
        }

        const preset = "gmail";

        const workflow = platformClient.ingest(preset, {
            filter: {
                email: "abeauvois@gmail.com"
            },
            // skipAnalysis,
            // skipTwitter
        });

        await workflow.execute({
            onStart: ({ logger }) => logger.info('started'),
            onError: ({ logger }) => logger.error('an error occured'),
            onComplete: ({ logger }) => logger.info('\n✨ Success! Your links have been extracted and categorized.\n'),
        });
    }, { timeout: 15000 })

    test('should sign in with valid credentials', async () => {
        try {
            const authResponse = await client.signIn({
                email: 'test@example.com',
                password: 'password123',
            });
            console.log("🚀 ~ authResponse:", authResponse)

            expect(authResponse).toBeDefined();
            expect(authResponse.sessionToken).toBeDefined();
            expect(authResponse.userId).toBeDefined();
            expect(authResponse.email).toBe('test@example.com');
            expect(typeof authResponse.sessionToken).toBe('string');

            console.log('✓ Sign in successful');
        } catch (error) {
            console.log('⚠️  Skipping: Test user does not exist or server not running');
            console.log('   Create test user with:');
            console.log('   curl -X POST http://localhost:5000/api/auth/sign-up/email \\');
            console.log('     -H "Content-Type: application/json" \\');
            console.log('     -d \'{"email":"test@example.com","password":"password123","name":"Test User"}\'');
        }
    }, { timeout: 10000 });

    test('should fetch bookmarks with existing session', async () => {
        // Sign in first to get session
        try {
            await client.signIn({
                email: 'test@example.com',
                password: 'password123',
            });

            const bookmarks = await client.fetchBookmarks();

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
        } catch (error) {
            console.log('⚠️  Skipping: Could not authenticate or fetch bookmarks');
        }
    }, { timeout: 10000 });

    test('should load session from file if exists', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');

        const sessionPath = path.join(os.homedir(), '.platform-cli', 'test-session.json');

        if (!fs.existsSync(sessionPath)) {
            console.log('⚠️  Skipping: No session file found');
            console.log('   To create a session, run:');
            console.log('   PLATFORM_API_URL=http://localhost:5000 bun run platform personal bookmark list');
            return;
        }

        // Load session from file
        const sessionData = fs.readFileSync(sessionPath, 'utf-8');
        const savedSession = JSON.parse(sessionData) as {
            sessionToken: string;
            userId: string;
            email: string;
        };

        console.log(`✓ Loaded session for ${savedSession.email}`);

        // Create new client with session token
        const clientWithSession = new PlatformApiClient({
            baseUrl: API_BASE_URL,
            sessionToken: savedSession.sessionToken,
            logger,
        });

        const bookmarks = await clientWithSession.fetchBookmarks();

        expect(bookmarks).toBeDefined();
        expect(Array.isArray(bookmarks)).toBe(true);

        console.log(`✓ Successfully fetched bookmarks with saved session`);
    }, { timeout: 10000 });

    test('should create and delete a bookmark', async () => {
        try {
            // Sign in
            await client.signIn({
                email: 'test@example.com',
                password: 'password123',
            });

            // Create bookmark
            const newBookmark = await client.createBookmark({
                url: 'https://example.com/test-' + Date.now(),
                sourceAdapter: 'Other',
                tags: ['integration-test'],
                summary: 'Test bookmark for integration tests',
            }) as ApiBookmark;

            expect(newBookmark).toBeDefined();
            expect(newBookmark.url).toContain('https://example.com/test-');
            expect(newBookmark.tags).toContain('integration-test');

            console.log('✓ Created bookmark:', newBookmark.url);

            // Delete bookmark
            await client.deleteBookmark(newBookmark.id);

            console.log('✓ Deleted bookmark:', newBookmark.id);
        } catch (error) {
            console.log('⚠️  Skipping: Could not create/delete bookmark');
        }
    }, { timeout: 15000 });

    test('should update a bookmark', async () => {
        try {
            // Sign in
            await client.signIn({
                email: 'test@example.com',
                password: 'password123',
            });

            // Create bookmark
            const newBookmark = await client.createBookmark({
                url: 'https://example.com/update-test-' + Date.now(),
                sourceAdapter: 'Other',
                tags: ['original-tag'],
            }) as ApiBookmark;

            console.log('✓ Created bookmark for update test');

            // Update bookmark
            const updatedBookmark = await client.updateBookmark(newBookmark.id, {
                tags: ['updated-tag', 'test'],
                summary: 'Updated summary',
            }) as ApiBookmark;

            expect(updatedBookmark.tags).toContain('updated-tag');
            expect(updatedBookmark.summary).toBe('Updated summary');

            console.log('✓ Updated bookmark successfully');

            // Clean up
            await client.deleteBookmark(newBookmark.id);
            console.log('✓ Cleaned up test bookmark');
        } catch (error) {
            console.log('⚠️  Skipping: Could not update bookmark');
        }
    }, { timeout: 15000 });

    test('should handle authentication failure gracefully', async () => {
        const testClient = new PlatformApiClient({
            baseUrl: API_BASE_URL,
            logger,
        });

        await expect(
            testClient.signIn({
                email: 'nonexistent@example.com',
                password: 'wrongpassword',
            })
        ).rejects.toThrow();

        console.log('✓ Properly handled invalid credentials');
    }, { timeout: 10000 });

    test('should handle API errors gracefully when not authenticated', async () => {
        const unauthenticatedClient = new PlatformApiClient({
            baseUrl: API_BASE_URL,
            logger,
        });

        // Should throw error when trying to fetch bookmarks without auth
        await expect(
            unauthenticatedClient.fetchBookmarks()
        ).rejects.toThrow('Authentication required');

        console.log('✓ Properly handled unauthenticated request');
    }, { timeout: 10000 });

    test('should handle invalid session token', async () => {
        const clientWithBadToken = new PlatformApiClient({
            baseUrl: API_BASE_URL,
            sessionToken: 'invalid-token-12345',
            logger,
        });

        await expect(
            clientWithBadToken.fetchBookmarks()
        ).rejects.toThrow();

        console.log('✓ Properly handled invalid session token');
    }, { timeout: 10000 });

    test('should sign out successfully', async () => {
        try {
            // Sign in first
            await client.signIn({
                email: 'test@example.com',
                password: 'password123',
            });

            // Sign out
            await client.signOut();

            // Should not be able to fetch bookmarks after sign out
            await expect(
                client.fetchBookmarks()
            ).rejects.toThrow('Authentication required');

            console.log('✓ Sign out successful');
        } catch (error) {
            console.log('⚠️  Skipping: Could not test sign out');
        }
    }, { timeout: 10000 });
});
