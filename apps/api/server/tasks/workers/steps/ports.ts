import type { BaseContent, ISourceReader, SourceReaderConfig } from '@platform/platform-domain';

// Re-export for convenience
export type { ISourceReader, SourceReaderConfig };

/**
 * Port: Content analyzer interface for AI-powered analysis
 */
export interface IContentAnalyser {
    analyze(url: string, additionalContext?: string): Promise<{ tags: string[]; summary: string }>;
}

/**
 * Port: Rate-limited client interface for fetching content with rate limiting
 */
export interface IRateLimitedClient {
    fetchContent(url: string): Promise<string | null>;
    isRateLimited(): boolean;
}

/**
 * Port: Export service interface
 */
export interface IExportService {
    exportToCsv(items: BaseContent[], outputPath: string): Promise<void>;
    exportToNotion(items: BaseContent[]): Promise<void>;
}

/**
 * Port: Bookmark repository interface for saving to database
 */
export interface ILinkRepository {
    saveMany(links: import('@platform/platform-domain').Bookmark[]): Promise<import('@platform/platform-domain').Bookmark[]>;
    existsByUrls(userId: string, urls: string[]): Promise<Set<string>>;
}
