import { ITimestampRepository } from '../../domain/ports/ITimestampRepository.js';
import { existsSync } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

/**
 * Infrastructure Adapter: FileTimestampRepository
 * 
 * Persists the last execution timestamp to a local file.
 * Implements ITimestampRepository port.
 * 
 * Storage format: Plain text file with ISO timestamp
 */

export class FileTimestampRepository implements ITimestampRepository {
    private readonly timestampFilePath: string;

    constructor(timestampFilePath: string = '.gmail-last-run') {
        this.timestampFilePath = timestampFilePath;
    }

    async getLastExecutionTime(): Promise<Date | null> {
        try {
            if (!existsSync(this.timestampFilePath)) {
                return null;
            }

            const content = await readFile(this.timestampFilePath, 'utf-8');
            const timestamp = content.trim();

            if (!timestamp) {
                return null;
            }

            return new Date(timestamp);
        } catch (error) {
            // If file doesn't exist or can't be read, treat as first run
            return null;
        }
    }

    async saveLastExecutionTime(timestamp: Date): Promise<void> {
        try {
            // Ensure directory exists
            const dir = dirname(this.timestampFilePath);
            if (dir !== '.') {
                await mkdir(dir, { recursive: true });
            }

            // Save ISO timestamp to file
            await writeFile(this.timestampFilePath, timestamp.toISOString(), 'utf-8');
        } catch (error) {
            throw new Error(
                `Failed to save timestamp: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }
}
