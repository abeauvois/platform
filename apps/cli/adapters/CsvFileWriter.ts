import { Bookmark } from '@abeauvois/platform-domain'

/**
 * Adapter: Implements CSV file writing using Bun's native file system
 */
export class CsvFileWriter {
    async write(links: Bookmark[], outputPath: string): Promise<void> {
        // CSV header
        const header = 'url,tags,summary\n';

        // Convert links to CSV rows
        const rows = links.map(link => {
            const escapedUrl = this.escapeCsvField(link.url);
            const escapedTag = this.escapeCsvField(link.tags.join(','));
            const escapedDescription = this.escapeCsvField(link.summary);

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
        if (!field) {
            return '';
        }
        // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
        if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    }
}
