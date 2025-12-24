import { PgBoss, type ConstructorOptions } from 'pg-boss';
import { QUEUE_NAMES } from './types';

let boss: PgBoss | null = null;

/**
 * Get pg-boss configuration based on environment
 */
function getBossConfig(): ConstructorOptions {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is required');
    }

    // pg-boss works best with a connection string directly
    // It will create its own optimized connection pool
    return {
        connectionString: process.env.DATABASE_URL,
        schema: 'pgboss',
        // Monitoring interval
        monitorIntervalSeconds: 30,
    };
}

/**
 * Initialize and start pg-boss
 * Call this during server startup
 */
export async function initializeBoss(): Promise<PgBoss> {
    if (boss) {
        return boss;
    }

    const config = getBossConfig();
    boss = new PgBoss(config);

    // Error handling
    boss.on('error', (error) => {
        console.error('pg-boss error:', error);
    });

    await boss.start();
    console.log('pg-boss started successfully');

    // Create queues (required in pg-boss v10+)
    await boss.createQueue(QUEUE_NAMES.INGEST);
    console.log('pg-boss queues created');

    return boss;
}

/**
 * Get the pg-boss instance
 * Throws if not initialized
 */
export function getBoss(): PgBoss {
    if (!boss) {
        throw new Error('pg-boss not initialized. Call initializeBoss() first.');
    }
    return boss;
}

/**
 * Gracefully stop pg-boss
 * Call during server shutdown
 */
export async function stopBoss(): Promise<void> {
    if (boss) {
        await boss.stop({ graceful: true });
        boss = null;
        console.log('pg-boss stopped');
    }
}
