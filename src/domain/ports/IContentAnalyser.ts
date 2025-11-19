/**
 * Port: Defines interface for analyzing and categorizing links
 */
export interface TagsAndSummary {
    tags: string[];
    summary: string;
}

export interface IContentAnalyser {
    /**
     * Analyzes a URL and generates categorization tags and summary
     * @param url The URL to analyze
     * @param additionalContext Optional additional context (e.g., tweet content) to improve analysis
     * @returns Tags and summary for the url link
     */
    analyze(url: string, additionalContext?: string): Promise<TagsAndSummary>;
}
