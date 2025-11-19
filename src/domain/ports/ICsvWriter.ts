import { Bookmark } from '../entities/Bookmark.js';

/**
 * Port: Defines interface for writing CSV files
 */
export interface ICsvWriter {
    /**
     * Writes email links to a CSV file
     * @param links Array of Bookmark entities
     * @param outputPath Path for the output CSV file
     */
    write(links: Bookmark[], outputPath: string): Promise<void>;
}
