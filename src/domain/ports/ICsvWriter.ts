import { EmailLink } from '../entities/EmailLink.js';

/**
 * Port: Defines interface for writing CSV files
 */
export interface ICsvWriter {
    /**
     * Writes email links to a CSV file
     * @param links Array of EmailLink entities
     * @param outputPath Path for the output CSV file
     */
    write(links: EmailLink[], outputPath: string): Promise<void>;
}
