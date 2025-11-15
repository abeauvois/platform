/**
 * Port: Defines interface for parsing email files
 */
export interface ILinksExtractor {
    /**
     * Extracts HTTP/HTTPS links from email content
     * @param emailContent Raw email file content
     * @returns Array of extracted URLs
     */
    extractLinks(emailContent: string): string[];
}
