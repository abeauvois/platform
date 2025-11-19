import { Bookmark } from '../../domain/entities/Bookmark.js';
import { ICsvWriter } from '../../domain/ports/ICsvWriter.js';

/**
 * Adapter: Implements CSV file writing using Bun's native file system
 */
export class CsvFileWriter implements ICsvWriter {
    async write(links: Bookmark[], outputPath: string): Promise<void> {
        // CSV header
        const header = 'link,tag,description\n';

        // Convert links to CSV rows
        const rows = links.map(link => {
            const escapedUrl = this.escapeCsvField(link.url);
            const escapedTag = this.escapeCsvField(link.tag);
            const escapedDescription = this.escapeCsvField(link.description);

            return `${escapedUrl},${escapedTag},${escapedDescription}`;
        });

        // Combine header and rows
        const csvContent = header + rows.join('\n');

        // Write to file using Bun
        await Bun.write(outputPath, csvContent);
    }

    /**
     * Escapes a field for CSV format (handles quotes, commas, newlines)
     */
    private escapeCsvField(field: string): string {
        // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
        if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    }
}
