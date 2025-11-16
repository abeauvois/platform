import { EmailLink } from '../../domain/entities/EmailLink';
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
     * @param notionDatabaseId Notion database ID
     * @param updatedUrls Optional set of URLs that were updated (for Notion page updates)
     */
    async exportResults(
        links: EmailLink[],
        outputCsvPath: string,
        notionDatabaseId: string,
        updatedUrls?: Set<string>
    ): Promise<void> {
        await this.exportToCsv(links, outputCsvPath);
        await this.exportToNotion(links, notionDatabaseId, updatedUrls);
    }

    /**
     * Export links to CSV file
     */
    private async exportToCsv(links: EmailLink[], path: string): Promise<void> {
        this.logger.info('\n💾 Writing results to CSV...');
        await this.csvWriter.write(links, path);
        this.logger.info(`✅ CSV export complete! Output saved to: ${path}`);
    }

    /**
     * Export links to Notion database using repository pattern
     * Handles partial failures gracefully (CSV export can succeed even if Notion fails)
     */
    private async exportToNotion(
        links: EmailLink[],
        databaseId: string,
        updatedUrls?: Set<string>
    ): Promise<void> {
        this.logger.info('\n📝 Exporting to Notion...');
        try {
            if (links.length === 0) {
                this.logger.info('No links to export to Notion');
                return;
            }

            this.logger.info(`Exporting ${links.length} links to Notion database...`);

            // If we have specific URLs to update, handle them separately
            if (updatedUrls && updatedUrls.size > 0) {
                this.logger.info(`\n📝 Updating ${updatedUrls.size} enriched Notion entries...`);

                let updated = 0;
                for (const link of links) {
                    if (updatedUrls.has(link.url)) {
                        try {
                            const exists = await this.notionRepository.exists(link.url);
                            if (exists) {
                                await this.notionRepository.save(link);
                                updated++;
                                this.logger.info(`  ✓ Updated: ${link.url}`);
                            } else {
                                this.logger.warning(`  ⚠️  Page not found for: ${link.url}`);
                            }
                        } catch (error) {
                            this.logger.error(`  ✗ Failed to update ${link.url}: ${error instanceof Error ? error.message : error}`);
                        }
                    }
                }

                this.logger.info(`✅ Notion updated (${updated} entries enriched)`);
            } else {
                // Save all links (repository handles create/update logic)
                await this.notionRepository.saveMany(links);
            }

            this.logger.info(`✅ Notion export complete!`);
        } catch (error) {
            this.logger.error(
                `❌ Notion export failed: ${error instanceof Error ? error.message : error}`
            );
            this.logger.info('Note: CSV export was successful. Only Notion export failed.');
        }
    }
}
