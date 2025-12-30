/**
 * Port: Web scraping service for fetching URL content
 *
 * Abstracts the HTTP fetching and HTML-to-text conversion
 * Implementations should handle rate limiting and retries
 */
export interface IWebScraper {
    /**
     * Fetch and extract text content from a URL
     *
     * @param url The URL to scrape
     * @returns The extracted text content, or null if scraping failed
     */
    scrape(url: string): Promise<string | null>;
}
