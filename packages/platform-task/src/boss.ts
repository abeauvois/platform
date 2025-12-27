import { PgBoss } from 'pg-boss';

let boss: PgBoss | null = null;

export interface BossConfig {
    connectionString: string;
    schema?: string;
}

/**
 * Initialize and start pg-boss
 * Call this during server startup
 */
export async function initBoss(config: BossConfig): Promise<PgBoss> {
    if (boss) {
        return boss;
    }

    boss = new PgBoss({
        connectionString: config.connectionString,
        schema: config.schema ?? 'pgboss',
        migrate: true,
    });

    boss.on('error', (error: Error) => {
        console.error('pg-boss error:', error);
    });

    await boss.start();

    return boss;
}

/**
 * Get the pg-boss instance
 * Throws if not initialized
 */
export function getBoss(): PgBoss {
    if (!boss) {
        throw new Error('pg-boss not initialized. Call initBoss() first.');
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
    }
}

/**
 * Create a queue (required in pg-boss v10+)
 */
export async function createQueue(queueName: string): Promise<void> {
    const b = getBoss();
    await b.createQueue(queueName);
}
