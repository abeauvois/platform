import { EmailLink } from '../domain/entities/EmailLink.js';
import { IZipExtractor } from '../domain/ports/IZipExtractor.js';
import { IEmailParser } from '../domain/ports/IEmailParser.js';
import { ILinkAnalyzer } from '../domain/ports/ILinkAnalyzer.js';
import { ICsvWriter } from '../domain/ports/ICsvWriter.js';
import { INotionWriter } from '../domain/ports/INotionWriter.js';

/**
 * Application Use Case: Orchestrates the email link extraction process
 */
export class ExtractLinksUseCase {
    constructor(
        private readonly zipExtractor: IZipExtractor,
        private readonly emailParser: IEmailParser,
        private readonly linkAnalyzer: ILinkAnalyzer,
        private readonly csvWriter: ICsvWriter,
        private readonly notionWriter: INotionWriter
    ) { }

    /**
     * Executes the complete link extraction workflow
     * @param zipFilePath Path to the input zip file
     * @param outputCsvPath Path for the output CSV file
     * @param notionDatabaseId Notion database ID for export
     */
    async execute(zipFilePath: string, outputCsvPath: string, notionDatabaseId: string): Promise<void> {
        console.log('📦 Extracting .eml files from zip...');
        const emailFiles = await this.zipExtractor.extractEmlFiles(zipFilePath);
        console.log(`✅ Found ${emailFiles.size} email files`);

        console.log('\n🔍 Parsing emails and extracting links...');
        const emailLinks: EmailLink[] = [];

        for (const [filename, content] of emailFiles.entries()) {
            const links = this.emailParser.extractLinks(content);

            if (links.length > 0) {
                // Take the first HTTP link found (as per requirement: "one main http link")
                const mainLink = links[0];
                emailLinks.push(new EmailLink(mainLink, '', '', filename));
                console.log(`  📧 ${filename}: ${mainLink}`);
            } else {
                console.log(`  ⚠️  ${filename}: No links found`);
            }
        }

        console.log(`\n✅ Extracted ${emailLinks.length} links`);

        console.log('\n🤖 Analyzing links with AI...');
        const categorizedLinks: EmailLink[] = [];

        for (let i = 0; i < emailLinks.length; i++) {
            const link = emailLinks[i];
            console.log(`  [${i + 1}/${emailLinks.length}] Analyzing: ${link.url}`);

            try {
                const analysis = await this.linkAnalyzer.analyze(link.url);
                const categorized = link.withCategorization(analysis.tag, analysis.description);
                categorizedLinks.push(categorized);
                console.log(`    ✓ Tag: ${analysis.tag}`);
            } catch (error) {
                console.error(`    ✗ Error analyzing link: ${error}`);
                // Add link with empty categorization on error
                categorizedLinks.push(link);
            }
        }

        console.log('\n💾 Writing results to CSV...');
        await this.csvWriter.write(categorizedLinks, outputCsvPath);
        console.log(`✅ CSV export complete! Output saved to: ${outputCsvPath}`);

        console.log('\n📝 Exporting to Notion...');
        try {
            await this.notionWriter.write(categorizedLinks, notionDatabaseId);
            console.log(`✅ Notion export complete!`);
        } catch (error) {
            console.error(`❌ Notion export failed: ${error instanceof Error ? error.message : error}`);
            console.log('Note: CSV export was successful. Only Notion export failed.');
        }

        console.log('\n✅ All done!');
    }
}
