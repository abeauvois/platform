import { EmailLink } from '../../domain/entities/EmailLink';
import { ILinksExtractor } from '../../domain/ports/ILinksExtractor';
import { ILogger } from '../../domain/ports/ILogger';
import { IZipExtractor } from '../../domain/ports/IZipExtractor';

/**
 * Service responsible for extracting and parsing email files
 */
export class EmailExtractionService {
    constructor(
        private readonly zipExtractor: IZipExtractor,
        private readonly LinksExtractor: ILinksExtractor,
        private readonly logger: ILogger
    ) { }

    /**
     * Extract email files from zip and parse links from them
     * @param zipFilePath Path to the zip file or directory containing .eml files
     * @returns Array of EmailLink objects with extracted links
     */
    async extractAndParseEmails(zipFilePath: string): Promise<EmailLink[]> {
        const emailFiles = await this.extractFiles(zipFilePath);
        return this.parseLinks(emailFiles);
    }

    /**
     * Extract .eml files from zip archive
     */
    private async extractFiles(zipFilePath: string): Promise<Map<string, string>> {
        this.logger.info('📦 Extracting .eml files from zip...');
        const emailFiles = await this.zipExtractor.extractEmlFiles(zipFilePath);
        this.logger.info(`✅ Found ${emailFiles.size} email files`);
        return emailFiles;
    }

    /**
     * Parse links from email files
     */
    private parseLinks(emailFiles: Map<string, string>): EmailLink[] {
        this.logger.info('\n🔍 Parsing emails and extracting links...');
        const emailLinks: EmailLink[] = [];

        for (const [filename, content] of emailFiles.entries()) {
            const links = this.LinksExtractor.extractLinks(content);

            if (links.length > 0) {
                const mainLink = links[0];
                emailLinks.push(new EmailLink(mainLink, '', '', filename));
                this.logger.info(`  📧 ${filename}: ${mainLink}`);
            } else {
                this.logger.warning(`  ⚠️  ${filename}: No links found`);
            }
        }

        this.logger.info(`\n✅ Extracted ${emailLinks.length} links`);
        return emailLinks;
    }
}
