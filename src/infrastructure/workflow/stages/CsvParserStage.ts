import { IStage } from '../../../domain/workflow/IStage.js';
import { BaseContent } from '../../../domain/entities/BaseContent.js';
import { ICsvParser } from '../../../domain/ports/ICsvParser.js';

/**
 * CSV Parser Stage
 * Detects CSV content and parses it into multiple BaseContent items (one per row)
 * Non-CSV content passes through unchanged
 */
export class CsvParserStage implements IStage<BaseContent, BaseContent> {
    constructor(private readonly csvParser: ICsvParser) { }

    async *process(content: BaseContent): AsyncIterable<BaseContent> {
        // Only process if content looks like CSV
        if (!this.isCsvContent(content.rawContent)) {
            yield content;
            return;
        }

        try {
            // Parse CSV content
            const rows = await this.csvParser.parse(content.rawContent);

            // Yield one BaseContent per CSV row
            for (const row of rows) {
                yield this.rowToBaseContent(row, content);
            }
        } catch (error) {
            // If parsing fails, pass through unchanged
            // (content might have looked like CSV but wasn't valid)
            yield content;
        }
    }

    /**
     * Check if content looks like CSV
     * Simple heuristic: first line contains commas and content has newlines
     */
    private isCsvContent(content: string): boolean {
        if (!content || content.length === 0) {
            return false;
        }

        const firstLine = content.split('\n')[0];

        // Must have commas in first line
        if (!firstLine.includes(',')) {
            return false;
        }

        // Must have at least 2 lines (header + data)
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        if (lines.length < 2) {
            return false;
        }

        return true;
    }

    /**
     * Convert a CSV row to BaseContent
     */
    private rowToBaseContent(row: Record<string, string>, source: BaseContent): BaseContent {
        // Extract URL from common column names
        const url = row.url || row.link || row.href || JSON.stringify(row);

        // Extract tags - split by semicolon or comma
        const tagsStr = row.tags || '';
        const tags = tagsStr
            ? tagsStr.split(/[;,]/).map(t => t.trim()).filter(t => t.length > 0)
            : [];

        // Extract summary
        const summary = row.summary || row.description || row.desc || '';

        return new BaseContent(
            url,
            source.sourceAdapter,
            tags,
            summary,
            JSON.stringify(row), // Preserve structured data as JSON
            source.createdAt,
            new Date() // Update timestamp
        );
    }
}
