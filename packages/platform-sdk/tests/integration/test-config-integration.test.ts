import { describe, test, expect, beforeAll } from 'bun:test';
import { PlatformApiClient, ApiConfigProvider } from '../../src/index.js';
import type { ILogger } from '@platform/domain';

/**
 * Integration tests for Configuration API
 *
 * Prerequisites:
 * 1. API server must be running at http://localhost:3000
 * 2. Test user must exist with credentials:
 *    - Email: test@example.com
 *    - Password: password123
 * 3. Environment variables must be set in /apps/api/.env:
 *    - ANTHROPIC_API_KEY
 *    - NOTION_INTEGRATION_TOKEN
 *    - etc.
 *
 * To create test user:
 * curl -X POST http://localhost:3000/api/auth/sign-up/email \
 *   -H "Content-Type: application/json" \
 *   -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
 *
 * Run tests:
 * bun test packages/platform-sdk/tests/integration/test-config-integration.test.ts
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

describe('Config API Integration Tests', () => {
    const API_BASE_URL = 'http://localhost:3000';
    let client: PlatformApiClient;
    let logger: ILogger;
    let sessionToken: string | undefined;

    beforeAll(async () => {
        logger = new TestLogger();
        client = new PlatformApiClient({
            baseUrl: API_BASE_URL,
            logger,
        });

        // Attempt to sign in to get a session
        try {
            const authResponse = await client.signIn({
                email: 'test@example.com',
                password: 'password123',
            });
            sessionToken = authResponse.sessionToken;
            console.log('✓ Authenticated for config tests');
        } catch (error) {
            console.log('⚠️  Could not authenticate. Some tests will be skipped.');
            console.log('   Create test user with:');
            console.log('   curl -X POST http://localhost:3000/api/auth/sign-up/email \\');
            console.log('     -H "Content-Type: application/json" \\');
            console.log('     -d \'{"email":"test@example.com","password":"password123","name":"Test User"}\'');
        }
    });

    describe('PlatformApiClient.fetchConfig()', () => {
        test('should fetch all config values', async () => {
            if (!sessionToken) {
                console.log('⚠️  Skipping: Not authenticated');
                return;
            }

            const configResponse = await client.fetchConfig();

            expect(configResponse).toBeDefined();
            expect(configResponse.userId).toBeDefined();
            expect(configResponse.config).toBeDefined();
            expect(configResponse.keys).toBeDefined();
            expect(Array.isArray(configResponse.keys)).toBe(true);

            console.log(`✓ Fetched ${configResponse.keys.length} config keys`);
            console.log(`  Available keys: ${configResponse.keys.join(', ')}`);
        }, { timeout: 10000 });

        test('should require authentication', async () => {
            const unauthClient = new PlatformApiClient({
                baseUrl: API_BASE_URL,
                logger,
            });

            await expect(unauthClient.fetchConfig()).rejects.toThrow(
                'Authentication required'
            );

            console.log('✓ Properly rejected unauthenticated request');
        }, { timeout: 10000 });
    });

    describe('PlatformApiClient.fetchConfigValue()', () => {
        test('should fetch a specific config value', async () => {
            if (!sessionToken) {
                console.log('⚠️  Skipping: Not authenticated');
                return;
            }

            // First get available keys
            const configResponse = await client.fetchConfig();

            if (configResponse.keys.length === 0) {
                console.log('⚠️  Skipping: No config keys available');
                return;
            }

            const testKey = configResponse.keys[0];
            const valueResponse = await client.fetchConfigValue(testKey);

            expect(valueResponse).toBeDefined();
            expect(valueResponse.key).toBe(testKey);
            expect(valueResponse.value).toBeDefined();
            expect(typeof valueResponse.value).toBe('string');

            console.log(`✓ Fetched config value for key: ${testKey}`);
        }, { timeout: 10000 });

        test('should return 404 for non-existent key', async () => {
            if (!sessionToken) {
                console.log('⚠️  Skipping: Not authenticated');
                return;
            }

            await expect(
                client.fetchConfigValue('NON_EXISTENT_KEY_12345')
            ).rejects.toThrow();

            console.log('✓ Properly rejected non-existent config key');
        }, { timeout: 10000 });

        test('should return 404 for disallowed key', async () => {
            if (!sessionToken) {
                console.log('⚠️  Skipping: Not authenticated');
                return;
            }

            // DATABASE_URL should not be exposed
            await expect(
                client.fetchConfigValue('DATABASE_URL')
            ).rejects.toThrow();

            console.log('✓ Properly rejected disallowed config key');
        }, { timeout: 10000 });
    });

    describe('PlatformApiClient.fetchConfigBatch()', () => {
        test('should fetch multiple config values', async () => {
            if (!sessionToken) {
                console.log('⚠️  Skipping: Not authenticated');
                return;
            }

            const batchResponse = await client.fetchConfigBatch([
                'ANTHROPIC_API_KEY',
                'NOTION_INTEGRATION_TOKEN',
                'NON_EXISTENT_KEY',
            ]);

            expect(batchResponse).toBeDefined();
            expect(batchResponse.config).toBeDefined();
            expect(batchResponse.found).toBeDefined();
            expect(batchResponse.missing).toBeDefined();
            expect(Array.isArray(batchResponse.found)).toBe(true);
            expect(Array.isArray(batchResponse.missing)).toBe(true);

            // NON_EXISTENT_KEY should be in missing
            expect(batchResponse.missing).toContain('NON_EXISTENT_KEY');

            console.log(`✓ Batch request: found ${batchResponse.found.length}, missing ${batchResponse.missing.length}`);
        }, { timeout: 10000 });

        test('should handle empty keys array', async () => {
            if (!sessionToken) {
                console.log('⚠️  Skipping: Not authenticated');
                return;
            }

            const batchResponse = await client.fetchConfigBatch([]);

            expect(batchResponse).toBeDefined();
            expect(batchResponse.found).toEqual([]);
            expect(Object.keys(batchResponse.config)).toHaveLength(0);

            console.log('✓ Properly handled empty batch request');
        }, { timeout: 10000 });
    });

    describe('PlatformApiClient.fetchConfigKeys()', () => {
        test('should list available config keys', async () => {
            if (!sessionToken) {
                console.log('⚠️  Skipping: Not authenticated');
                return;
            }

            const keysResponse = await client.fetchConfigKeys();

            expect(keysResponse).toBeDefined();
            expect(keysResponse.keys).toBeDefined();
            expect(keysResponse.total).toBeDefined();
            expect(Array.isArray(keysResponse.keys)).toBe(true);
            expect(typeof keysResponse.total).toBe('number');
            expect(keysResponse.keys.length).toBe(keysResponse.total);

            console.log(`✓ Listed ${keysResponse.total} available config keys`);
        }, { timeout: 10000 });
    });

    describe('ApiConfigProvider', () => {
        test('should load config from API', async () => {
            if (!sessionToken) {
                console.log('⚠️  Skipping: Not authenticated');
                return;
            }

            const configProvider = new ApiConfigProvider({
                baseUrl: API_BASE_URL,
                sessionToken,
                logger,
            });

            await configProvider.load();

            expect(configProvider.isLoaded()).toBe(true);
            expect(configProvider.keys().length).toBeGreaterThanOrEqual(0);

            console.log(`✓ ApiConfigProvider loaded ${configProvider.keys().length} keys`);
        }, { timeout: 10000 });

        test('should get config value after loading', async () => {
            if (!sessionToken) {
                console.log('⚠️  Skipping: Not authenticated');
                return;
            }

            const configProvider = new ApiConfigProvider({
                baseUrl: API_BASE_URL,
                sessionToken,
                logger,
            });

            await configProvider.load();

            const keys = configProvider.keys();
            if (keys.length === 0) {
                console.log('⚠️  Skipping: No config keys available');
                return;
            }

            const value = configProvider.get(keys[0]);
            expect(value).toBeDefined();
            expect(typeof value).toBe('string');

            console.log(`✓ Got value for key: ${keys[0]}`);
        }, { timeout: 10000 });

        test('should throw if config not loaded', () => {
            const configProvider = new ApiConfigProvider({
                baseUrl: API_BASE_URL,
                sessionToken: sessionToken || 'dummy',
                logger,
            });

            expect(() => configProvider.get('ANY_KEY')).toThrow(
                'Configuration not loaded'
            );

            console.log('✓ Properly threw when config not loaded');
        });

        test('should throw for non-existent key', async () => {
            if (!sessionToken) {
                console.log('⚠️  Skipping: Not authenticated');
                return;
            }

            const configProvider = new ApiConfigProvider({
                baseUrl: API_BASE_URL,
                sessionToken,
                logger,
            });

            await configProvider.load();

            expect(() => configProvider.get('NON_EXISTENT_KEY_12345')).toThrow(
                'Configuration key not found'
            );

            console.log('✓ Properly threw for non-existent key');
        }, { timeout: 10000 });

        test('should return default for optional non-existent key', async () => {
            if (!sessionToken) {
                console.log('⚠️  Skipping: Not authenticated');
                return;
            }

            const configProvider = new ApiConfigProvider({
                baseUrl: API_BASE_URL,
                sessionToken,
                logger,
            });

            await configProvider.load();

            const value = configProvider.getOptional('NON_EXISTENT_KEY', 'default-value');
            expect(value).toBe('default-value');

            console.log('✓ Returned default for optional non-existent key');
        }, { timeout: 10000 });

        test('should check if key exists with has()', async () => {
            if (!sessionToken) {
                console.log('⚠️  Skipping: Not authenticated');
                return;
            }

            const configProvider = new ApiConfigProvider({
                baseUrl: API_BASE_URL,
                sessionToken,
                logger,
            });

            await configProvider.load();

            expect(configProvider.has('NON_EXISTENT_KEY')).toBe(false);

            const keys = configProvider.keys();
            if (keys.length > 0) {
                expect(configProvider.has(keys[0])).toBe(true);
            }

            console.log('✓ has() works correctly');
        }, { timeout: 10000 });

        test('should reload config', async () => {
            if (!sessionToken) {
                console.log('⚠️  Skipping: Not authenticated');
                return;
            }

            const configProvider = new ApiConfigProvider({
                baseUrl: API_BASE_URL,
                sessionToken,
                logger,
            });

            await configProvider.load();
            const initialKeys = configProvider.keys().length;

            await configProvider.reload();
            const reloadedKeys = configProvider.keys().length;

            expect(reloadedKeys).toBe(initialKeys);
            expect(configProvider.isLoaded()).toBe(true);

            console.log('✓ Config reloaded successfully');
        }, { timeout: 10000 });

        test('should fail with invalid session token', async () => {
            const configProvider = new ApiConfigProvider({
                baseUrl: API_BASE_URL,
                sessionToken: 'invalid-token-12345',
                logger,
            });

            await expect(configProvider.load()).rejects.toThrow();

            console.log('✓ Properly rejected invalid session token');
        }, { timeout: 10000 });
    });
});
