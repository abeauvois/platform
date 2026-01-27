import { describe, test, expect, beforeAll } from 'bun:test';
import { PlatformApiClient } from '@abeauvois/platform-sdk';

const API_BASE_URL = 'http://localhost:3000';

/**
 * Check if the API server is available before running integration tests.
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

await serverAvailablePromise.then(available => {
    serverAvailable = available;
    if (!available) {
        console.log('\n  API server not available at', API_BASE_URL);
        console.log('   Skipping integration tests. Start the server with: bun run api\n');
    }
});

/**
 * Simple logger for tests
 */
const testLogger = {
    info: (message: string) => console.log(`[INFO] ${message}`),
    error: (message: string) => console.error(`[ERROR] ${message}`),
    warning: (message: string) => console.warn(`[WARN] ${message}`),
    debug: (message: string) => console.debug(`[DEBUG] ${message}`),
    await: (message: string) => ({
        start: () => console.log(`[LOADING] ${message}`),
        update: (msg: string) => console.log(`[LOADING] ${msg}`),
        stop: () => console.log(`[DONE]`),
    }),
};

/**
 * Integration tests for CLI Gmail Source command
 *
 * Tests the `cli list source gmail` command functionality through the SDK.
 *
 * Prerequisites:
 * 1. API server must be running at http://localhost:3000
 * 2. Test user must exist with credentials:
 *    - Email: test@example.com
 *    - Password: password123
 */
describe.skipIf(!serverAvailable)('CLI Gmail Source Integration Tests', () => {
    let client: PlatformApiClient;

    beforeAll(async () => {
        client = new PlatformApiClient({
            baseUrl: API_BASE_URL,
            logger: testLogger,
        });

        // Authenticate
        await client.auth.signIn({
            email: 'test@example.com',
            password: 'password123',
        });
    });

    test('should trigger gmail workflow with filter and limit-days', async () => {
        const workflow = client.workflow.create('gmail', {
            filter: {
                email: 'abeauvois@gmail.com',
                limitDays: 7,
            },
        });

        let started = false;
        let completed = false;
        const processedIndices: number[] = [];
        let finalProcessedItems: unknown[] = [];

        await workflow.execute({
            onStart: ({ logger }: { logger: typeof testLogger }) => {
                started = true;
                logger.info('Workflow started');
            },
            onItemProcessed: ({ index, total, stepName, success }: { index: number; total: number; stepName: string; success: boolean }) => {
                testLogger.info(`${stepName}: ${index + 1}/${total} (success: ${success})`);
                processedIndices.push(index);
            },
            onComplete: ({ stats, processedItems, logger }: { stats: { itemsProcessed: number; itemsCreated: number; durationMs: number }; processedItems: unknown[]; logger: typeof testLogger }) => {
                completed = true;
                finalProcessedItems = processedItems;
                logger.info(`Completed: ${stats.itemsProcessed} items processed, ${stats.itemsCreated} created in ${stats.durationMs}ms`);
                logger.info(`Processed items: ${JSON.stringify(processedItems)}`);
            },
            onError: ({ logger }: { logger: typeof testLogger }) => {
                logger.error('Workflow error occurred');
            },
        });

        expect(started).toBe(true);
        expect(completed).toBe(true);
        // Verify onItemProcessed was called for each item (if any were processed)
        expect(processedIndices).toEqual([...processedIndices].sort((a, b) => a - b));
        // Verify onComplete received the processed items
        expect(Array.isArray(finalProcessedItems)).toBe(true);
    }, { timeout: 30000 });

    test('should trigger gmail workflow with only limit-days', async () => {
        const workflow = client.workflow.create('gmail', {
            filter: {
                limitDays: 3,
            },
        });

        let completed = false;

        await workflow.execute({
            onComplete: () => {
                completed = true;
            },
        });

        expect(completed).toBe(true);
    }, { timeout: 30000 });

    test('should trigger gmail workflow with default options', async () => {
        const workflow = client.workflow.create('gmail', {});

        let completed = false;

        await workflow.execute({
            onComplete: () => {
                completed = true;
            },
        });

        expect(completed).toBe(true);
    }, { timeout: 30000 });
});
