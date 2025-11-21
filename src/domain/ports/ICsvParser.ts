/**
 * CSV Parser Port
 * Defines the contract for parsing CSV content into structured rows
 */
export interface ICsvParser {
    /**
     * Parse CSV content into array of row objects
     * @param content - The raw CSV content as a string
     * @returns Promise of array of row objects where keys are column headers
     */
    parse(content: string): Promise<CsvRow[]>;
}

/**
 * Represents a single CSV row as key-value pairs
 * Keys are column headers, values are cell contents
 */
export interface CsvRow {
    [key: string]: string;
}
