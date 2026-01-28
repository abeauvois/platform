import type { ITimestampRepository } from '../domain/ports/ITimestampRepository.js';

/**
 * In-Memory Timestamp Repository
 * Stores last execution timestamps in memory (resets on server restart)
 *
 * For production, consider using DbTimestampRepository with persistent storage
 */
export class InMemoryTimestampRepository implements ITimestampRepository {
    private readonly timestamps: Map<string, Date> = new Map();
    private readonly defaultKey: string = 'default';

    constructor(key?: string) {
        if (key) {
            this.defaultKey = key;
        }
    }

    async getLastExecutionTime(): Promise<Date | null> {
        return this.timestamps.get(this.defaultKey) || null;
    }

    async saveLastExecutionTime(timestamp: Date): Promise<void> {
        this.timestamps.set(this.defaultKey, timestamp);
    }

    /**
     * Get timestamp for a specific key (useful for per-user tracking)
     */
    async getLastExecutionTimeForKey(key: string): Promise<Date | null> {
        return this.timestamps.get(key) || null;
    }

    /**
     * Save timestamp for a specific key
     */
    async saveLastExecutionTimeForKey(key: string, timestamp: Date): Promise<void> {
        this.timestamps.set(key, timestamp);
    }

    /**
     * Clear all stored timestamps
     */
    clear(): void {
        this.timestamps.clear();
    }
}

// Singleton instance for shared state across requests
export const timestampRepository = new InMemoryTimestampRepository();
