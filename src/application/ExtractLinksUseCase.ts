import { EmailLink } from '../domain/entities/EmailLink.js';
import { IZipExtractor } from '../domain/ports/IZipExtractor.js';
import { IEmailParser } from '../domain/ports/IEmailParser.js';
import { ILinkAnalyzer } from '../domain/ports/ILinkAnalyzer.js';
import { ICsvWriter } from '../domain/ports/ICsvWriter.js';
import { INotionWriter } from '../domain/ports/INotionWriter.js';
import { ITweetScraper } from '../domain/ports/ITweetScraper.js';

interface QueuedLink {
    link: EmailLink;
    index: number;
}

/**
 * Application Use Case: Orchestrates the email link extraction process
 */
export class ExtractLinksUseCase {
    private static readonly MAX_WAIT_SECONDS = 15 * 60; // 15 minutes
    private static readonly RATE_LIMIT_BUFFER_MS = 5000; // 5 second buffer
    private static readonly COUNTDOWN_INTERVAL = 10; // Show countdown every 10 seconds

    constructor(
        private readonly zipExtractor: IZipExtractor,
        private readonly emailParser: IEmailParser,
        private readonly linkAnalyzer: ILinkAnalyzer,
        private readonly csvWriter: ICsvWriter,
        private readonly notionWriter: INotionWriter,
        private readonly tweetScraper: ITweetScraper
    ) { }

    static isTwitterUrl(url: string): boolean {
        return url.includes('twitter.com/') || url.includes('x.com/') || url.includes('t.co/')
    }

    /**
     * Executes the complete link extraction workflow
     * @param zipFilePath Path to the input zip file
     * @param outputCsvPath Path for the output CSV file
     * @param notionDatabaseId Notion database ID for export
     */
    async execute(zipFilePath: string, outputCsvPath: string, notionDatabaseId: string): Promise<void> {
        const emailFiles = await this.extractEmailFiles(zipFilePath);
        const emailLinks = await this.parseEmailLinks(emailFiles);
        const { categorizedLinks, retryQueue } = await this.analyzeLinks(emailLinks);

        // Handle retry queue if needed, otherwise export results
        if (retryQueue.length > 0) {
            await this.handleRetryQueue(retryQueue, categorizedLinks, outputCsvPath, notionDatabaseId);
        } else {
            await this.exportResults(categorizedLinks, outputCsvPath, notionDatabaseId);
        }

        console.log('\n✅ All done!');
    }

    /**
     * Extract email files from zip/directory
     */
    private async extractEmailFiles(zipFilePath: string): Promise<Map<string, string>> {
        console.log('📦 Extracting .eml files from zip...');
        const emailFiles = await this.zipExtractor.extractEmlFiles(zipFilePath);
        console.log(`✅ Found ${emailFiles.size} email files`);
        return emailFiles;
    }

    /**
     * Parse email files and extract links
     */
    private async parseEmailLinks(emailFiles: Map<string, string>): Promise<EmailLink[]> {
        console.log('\n🔍 Parsing emails and extracting links...');
        const emailLinks: EmailLink[] = [];

        for (const [filename, content] of emailFiles.entries()) {
            const links = this.emailParser.extractLinks(content);

            if (links.length > 0) {
                const mainLink = links[0];
                emailLinks.push(new EmailLink(mainLink, '', '', filename));
                console.log(`  📧 ${filename}: ${mainLink}`);
            } else {
                console.log(`  ⚠️  ${filename}: No links found`);
            }
        }

        console.log(`\n✅ Extracted ${emailLinks.length} links`);
        return emailLinks;
    }

    /**
     * Analyze all links with AI, queue rate-limited Twitter links for retry
     */
    private async analyzeLinks(emailLinks: EmailLink[]): Promise<{
        categorizedLinks: EmailLink[];
        retryQueue: QueuedLink[];
    }> {
        console.log('\n🤖 Analyzing links with AI...');
        const categorizedLinks: EmailLink[] = [];
        const retryQueue: QueuedLink[] = [];

        for (let i = 0; i < emailLinks.length; i++) {
            const link = emailLinks[i];
            console.log(`  [${i + 1}/${emailLinks.length}] Analyzing: ${link.url}`);

            try {
                const { categorized, shouldRetry } = await this.analyzeLink(link);
                categorizedLinks.push(categorized);
                console.log(`    ✓ Tag: ${categorized.tag}`);

                if (shouldRetry) {
                    retryQueue.push({ link, index: categorizedLinks.length - 1 });
                }
            } catch (error) {
                console.error(`    ✗ Error analyzing link: ${error}`);
                categorizedLinks.push(link);
            }
        }

        return { categorizedLinks, retryQueue };
    }

    /**
     * Analyze a single link with optional tweet content
     */
    private async analyzeLink(link: EmailLink): Promise<{
        categorized: EmailLink;
        shouldRetry: boolean;
    }> {
        const isTwitterUrl = ExtractLinksUseCase.isTwitterUrl(link.url);
        let tweetContent: string | null = null;

        if (isTwitterUrl) {
            console.log(`    🐦 Fetching tweet content...`);
            tweetContent = await this.tweetScraper.fetchTweetContent(link.url);
            if (tweetContent) {
                console.log(`    ✓ Tweet content retrieved`);
            }
        }

        const analysis = await this.linkAnalyzer.analyze(link.url, tweetContent || undefined);
        const categorized = link.withCategorization(analysis.tag, analysis.description);

        // Check if this should be queued for retry
        const shouldRetry = isTwitterUrl &&
            analysis.tag === 'Unknown' &&
            !tweetContent &&
            (this.tweetScraper as any).isRateLimited();

        return { categorized, shouldRetry };
    }

    /**
     * Export results to CSV and Notion
     */
    private async exportResults(
        categorizedLinks: EmailLink[],
        outputCsvPath: string,
        notionDatabaseId: string,
        updatedUrls?: Set<string>
    ): Promise<void> {
        console.log('\n💾 Writing results to CSV...');
        await this.csvWriter.write(categorizedLinks, outputCsvPath);
        console.log(`✅ CSV export complete! Output saved to: ${outputCsvPath}`);

        console.log('\n📝 Exporting to Notion...');
        try {
            await this.notionWriter.write(categorizedLinks, notionDatabaseId);
            console.log(`✅ Notion export complete!`);

            // Update enriched entries if provided
            if (updatedUrls && updatedUrls.size > 0) {
                await (this.notionWriter as any).updatePages(categorizedLinks, notionDatabaseId, updatedUrls);
            }
        } catch (error) {
            console.error(`❌ Notion export failed: ${error instanceof Error ? error.message : error}`);
            console.log('Note: CSV export was successful. Only Notion export failed.');
        }
    }

    /**
     * Handle the retry queue for rate-limited Twitter links
     */
    private async handleRetryQueue(
        retryQueue: QueuedLink[],
        categorizedLinks: EmailLink[],
        outputCsvPath: string,
        notionDatabaseId: string
    ): Promise<void> {
        const waitSeconds = this.getRateLimitWaitTime();

        console.log(`\n⏳ ${retryQueue.length} Twitter links rate-limited. Reset in ${waitSeconds} seconds`);

        if (waitSeconds > ExtractLinksUseCase.MAX_WAIT_SECONDS) {
            console.log(`⚠️  Wait time exceeds 15 minutes. Skipping retry - links kept as "Unknown"`);
            await this.exportResults(categorizedLinks, outputCsvPath, notionDatabaseId);
            return;
        }

        await this.waitForRateLimitReset();
        const updatedUrls = await this.retryQueuedLinks(retryQueue, categorizedLinks);

        console.log('\n💾 Updating CSV with enriched results...');
        await this.csvWriter.write(categorizedLinks, outputCsvPath);
        console.log(`✅ CSV updated! Output saved to: ${outputCsvPath}`);

        await this.exportResults(categorizedLinks, outputCsvPath, notionDatabaseId, updatedUrls);
    }

    /**
     * Get seconds until rate limit reset
     */
    private getRateLimitWaitTime(): number {
        const resetTime = (this.tweetScraper as any).getRateLimitResetTime();
        return Math.ceil((resetTime - Date.now()) / 1000);
    }

    /**
     * Wait for rate limit reset with countdown
     */
    private async waitForRateLimitReset(): Promise<void> {
        console.log(`⏳ Waiting for rate limit reset...`);
        const resetTime = (this.tweetScraper as any).getRateLimitResetTime();
        const endWait = resetTime + ExtractLinksUseCase.RATE_LIMIT_BUFFER_MS;

        while (Date.now() < endWait) {
            const remaining = Math.ceil((endWait - Date.now()) / 1000);
            if (remaining > 0 && remaining % ExtractLinksUseCase.COUNTDOWN_INTERVAL === 0) {
                console.log(`⏳ ${remaining}s remaining...`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Clear the rate limit now that we've waited
        if ('clearRateLimit' in this.tweetScraper) {
            (this.tweetScraper as any).clearRateLimit();
        }

        console.log(`✅ Rate limit reset! Retrying...\n`);
    }

    /**
     * Retry all queued links and return URLs that were successfully enriched
     */
    private async retryQueuedLinks(
        retryQueue: QueuedLink[],
        categorizedLinks: EmailLink[]
    ): Promise<Set<string>> {
        console.log(`🔄 Retrying ${retryQueue.length} rate-limited links...`);
        const updatedUrls = new Set<string>();
        let successCount = 0;

        for (let i = 0; i < retryQueue.length; i++) {
            const { link, index } = retryQueue[i];
            console.log(`  [${i + 1}/${retryQueue.length}] Retrying: ${link.url}`);

            try {
                const enriched = await this.retryLink(link);

                if (enriched) {
                    categorizedLinks[index] = enriched;
                    updatedUrls.add(link.url);
                    successCount++;
                    console.log(`    ✓ Enriched with tag: ${enriched.tag}`);
                } else {
                    console.log(`    ⚠️  Still unable to fetch tweet content`);
                }
            } catch (error) {
                console.error(`    ✗ Retry failed: ${error}`);
            }
        }

        console.log(`\n✅ Retry complete: ${successCount}/${retryQueue.length} links enriched`);
        return updatedUrls;
    }

    /**
     * Retry a single link by fetching tweet content and re-analyzing
     */
    private async retryLink(link: EmailLink): Promise<EmailLink | null> {
        const tweetContent = await this.tweetScraper.fetchTweetContent(link.url);

        if (!tweetContent) {
            return null;
        }

        console.log(`    ✓ Tweet content retrieved`);
        const analysis = await this.linkAnalyzer.analyze(link.url, tweetContent);
        return link.withCategorization(analysis.tag, analysis.description);
    }
}
