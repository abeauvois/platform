/**
 * Maximum number of URLs to extract from a single page
 * Limits cost and processing time for enrichment
 */
export const MAX_EXTRACTED_URLS = 3;

/**
 * Result of URL extraction from page content (Level 1)
 */
export interface UrlExtractionResult {
    /** Relevant URLs found in page content (max MAX_EXTRACTED_URLS) */
    extractedUrls: string[];
}

/**
 * Result of content analysis (Level 2)
 */
export interface ContentAnalysisResult {
    /** Tags categorizing the content */
    tags: string[];
    /** Summary of the content */
    summary: string;
}

/**
 * Port: AI-powered bookmark enrichment service
 *
 * Two-level enrichment process:
 * 1. extractUrls: Find relevant URLs from a page's content
 * 2. analyzeContent: Generate tags and summary for a specific URL's content
 */
export interface IBookmarkEnricher {
    /**
     * Level 1: Extract relevant URLs from page content
     * Returns the top most relevant URLs (up to MAX_EXTRACTED_URLS)
     *
     * @param url The source URL being analyzed
     * @param pageContent The scraped text content of the page
     * @returns Extracted URLs found in the page
     */
    extractUrls(url: string, pageContent: string): Promise<UrlExtractionResult>;

    /**
     * Level 2: Analyze content to generate tags and summary
     *
     * @param url The URL being analyzed
     * @param pageContent The scraped text content of the page
     * @returns Tags and summary for the content
     */
    analyzeContent(url: string, pageContent: string): Promise<ContentAnalysisResult>;
}
