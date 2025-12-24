import type { PgBoss } from 'pg-boss';
import { registerIngestWorker } from './ingest.worker';

/**
 * Register all workers with pg-boss
 */
export async function registerAllWorkers(boss: PgBoss): Promise<void> {
    await registerIngestWorker(boss);
    // Add more workers here as needed
}
