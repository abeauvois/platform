/**
 * Port: URL extraction interface
 * Abstracts URL detection and extraction from text content
 */
export interface IUrlExtractor {
    /**
     * Check if content contains a URL
     * @param content The text content to check
     * @returns true if content contains at least one URL
     */
    containsUrl(content: string): boolean;

    /**
     * Extract the first URL from content
     * @param content The text content to extract from
     * @returns The first URL found, or empty string if none
     */
    extractFirst(content: string): string;
}
