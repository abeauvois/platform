import { parse } from 'csv-parse/sync';
import { ICsvParser, CsvRow } from '../../domain/ports/ICsvParser.js';

/**
 * Simple CSV Parser using csv-parse library
 * Parses CSV content with headers into structured row objects
 */
export class SimpleCsvParser implements ICsvParser {
    /**
     * Parse CSV content into array of row objects
     * @param content - The raw CSV content as a string
     * @returns Promise of array of row objects where keys are column headers
     */
    async parse(content: string): Promise<CsvRow[]> {
        try {
            // Use csv-parse synchronous API
            const records = parse(content, {
                columns: true, // Use first row as column headers
                skip_empty_lines: true, // Skip empty lines
                trim: true, // Trim whitespace from values
            });

            return records as CsvRow[];
        } catch (error) {
            throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
