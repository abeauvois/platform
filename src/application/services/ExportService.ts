import { Bookmark } from '../../domain/entities/Bookmark';
import { ICsvWriter } from '../../domain/ports/ICsvWriter';
import { ILogger } from '../../domain/ports/ILogger';
import { ILinkRepository } from '../../domain/ports/ILinkRepository';

/**
 * Service responsible for exporting results to CSV and Notion
 */
export class ExportService {
    constructor(
        private readonly csvWriter: ICsvWriter,
        private readonly notionRepository: ILinkRepository,
        private readonly logger: ILogger
    ) { }

    /**
     * Export results to both CSV and Notion
     * @param links Categorized links to export
     * @param outputCsvPath Path for CSV output
     * @param updatedUrls Optional set of URLs that were updated (for Notion page updates)
     */
    async exportResults(
        links: Bookmark[],
        outputCsvPath: string,
        updatedUrls?: Set<string>
    ): Promise<void> {
        await this.exportToCsv(links, outputCsvPath);
        await this.exportToNotion(links, updatedUrls);
    }

    /**
     * Export links to CSV file
     */
    private async exportToCsv(links: Bookmark[], path: string): Promise<void> {
        this.logger.info('\n💾 Writing results to CSV...');
        await this.csvWriter.write(links, path);
        this.logger.info(`✅ CSV export complete! Output saved to: ${path}`);
    }

    /**
     * Export links to Notion database using repository pattern
     * Handles partial failures gracefully (CSV export can succeed even if Notion fails)
     */
    private async exportToNotion(
        links: Bookmark[],
        updatedUrls?: Set<string>
    ): Promise<void> {
        this.logger.info('\n📝 Exporting to Notion...');

        if (links.length === 0) {
            this.logger.info('No links to export to Notion');
            return;
        }

        try {
            this.logger.info(`Exporting ${links.length} links to Notion database...`);

            const hasUpdatesToApply = updatedUrls && updatedUrls.size > 0;
            if (hasUpdatesToApply) {
                await this.updateEnrichedEntries(links, updatedUrls);
            } else {
                await this.notionRepository.saveMany(links);
            }

            this.logger.info(`✅ Notion export complete!`);
        } catch (error) {
            this.logExportError(error);
        }
    }

    /**
     * Update specific enriched entries in Notion
     */
    private async updateEnrichedEntries(
        links: Bookmark[],
        updatedUrls: Set<string>
    ): Promise<void> {
        this.logger.info(`\n📝 Updating ${updatedUrls.size} enriched Notion entries...`);

        const linksToUpdate = links.filter(link => updatedUrls.has(link.url));
        let updated = 0;

        for (const link of linksToUpdate) {
            const success = await this.updateSingleEntry(link);
            if (success) updated++;
        }

        this.logger.info(`✅ Notion updated (${updated} entries enriched)`);
    }

    /**
     * Update a single entry in Notion, returns true if successful
     */
    private async updateSingleEntry(link: Bookmark): Promise<boolean> {
        try {
            const exists = await this.notionRepository.exists(link.url);
            if (!exists) {
                this.logger.warning(`  ⚠️  Page not found for: ${link.url}`);
                return false;
            }

            await this.notionRepository.save(link);
            this.logger.info(`  ✓ Updated: ${link.url}`);
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`  ✗ Failed to update ${link.url}: ${message}`);
            return false;
        }
    }

    /**
     * Log export error with context
     */
    private logExportError(error: unknown): void {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`❌ Notion export failed: ${message}`);
        this.logger.info('Note: CSV export was successful. Only Notion export failed.');
    }
}
