import { Bookmark } from '../../domain/entities/Bookmark.js';
import { ILinkRepository } from '../../domain/ports/ILinkRepository.js';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * CSV File Implementation of ILinkRepository
 * Stores and retrieves Bookmark entities from a CSV file
 * CSV Format: URL,SourceAdapter,Tags,Summary,RawContent,CreatedAt,UpdatedAt,UserId
 */
export class CsvLinkRepository implements ILinkRepository {
    private readonly filePath: string;
    private cache: Map<string, Bookmark> | null = null;

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    async exists(url: string): Promise<boolean> {
        await this.ensureCache();
        return this.cache!.has(url);
    }

    async findByUrl(url: string): Promise<Bookmark | null> {
        await this.ensureCache();
        return this.cache!.get(url) || null;
    }

    async save(link: Bookmark): Promise<void> {
        await this.ensureCache();
        this.cache!.set(link.url, link);
        await this.writeToFile();
    }

    async saveMany(links: Bookmark[]): Promise<void> {
        await this.ensureCache();
        for (const link of links) {
            this.cache!.set(link.url, link);
        }
        await this.writeToFile();
    }

    async findAll(): Promise<Bookmark[]> {
        await this.ensureCache();
        return Array.from(this.cache!.values());
    }

    async findByUserId(userId: string): Promise<Bookmark[]> {
        await this.ensureCache();
        return Array.from(this.cache!.values()).filter(
            bookmark => bookmark.userId === userId
        );
    }

    async clear(): Promise<void> {
        this.cache = new Map();
        await this.writeToFile();
    }

    /**
     * Ensure cache is loaded from file
     */
    private async ensureCache(): Promise<void> {
        if (this.cache !== null) {
            return;
        }

        this.cache = new Map();

        // If file doesn't exist, start with empty cache
        if (!existsSync(this.filePath)) {
            return;
        }

        try {
            const content = await readFile(this.filePath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());

            // Skip header if present
            const dataLines = lines[0]?.startsWith('URL,') || lines[0]?.startsWith('"URL"')
                ? lines.slice(1)
                : lines;

            for (const line of dataLines) {
                const parsed = this.parseCsvLine(line);
                if (parsed && parsed.url) {
                    const sourceAdapter = parsed.sourceAdapter as any || 'EmlFile';
                    const link = new Bookmark(
                        parsed.url,
                        sourceAdapter,
                        parsed.tags ? JSON.parse(parsed.tags) : [],
                        parsed.summary || '',
                        parsed.rawContent || '',
                        parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
                        parsed.updatedAt ? new Date(parsed.updatedAt) : new Date(),
                        parsed.userId || undefined
                    );
                    this.cache.set(link.url, link);
                }
            }
        } catch (error) {
            throw new Error(`Failed to read CSV file ${this.filePath}: ${error instanceof Error ? error.message : error}`);
        }
    }

    /**
     * Write cache to CSV file
     */
    private async writeToFile(): Promise<void> {
        if (!this.cache) {
            return;
        }

        try {
            const lines: string[] = [];

            // Header
            lines.push('URL,SourceAdapter,Tags,Summary,RawContent,CreatedAt,UpdatedAt,UserId');

            // Data rows
            for (const link of this.cache.values()) {
                lines.push(this.toCsvLine(link));
            }

            await writeFile(this.filePath, lines.join('\n'), 'utf-8');
        } catch (error) {
            throw new Error(`Failed to write CSV file ${this.filePath}: ${error instanceof Error ? error.message : error}`);
        }
    }

    /**
     * Convert Bookmark to CSV line
     */
    private toCsvLine(link: Bookmark): string {
        return [
            this.escapeCsvField(link.url),
            this.escapeCsvField(link.sourceAdapter),
            this.escapeCsvField(JSON.stringify(link.tags)),
            this.escapeCsvField(link.summary),
            this.escapeCsvField(link.rawContent),
            this.escapeCsvField(link.createdAt.toISOString()),
            this.escapeCsvField(link.updatedAt.toISOString()),
            this.escapeCsvField(link.userId || ''),
        ].join(',');
    }

    /**
     * Parse a CSV line into components
     */
    private parseCsvLine(line: string): {
        url: string;
        sourceAdapter: string;
        tags: string;
        summary: string;
        rawContent: string;
        createdAt?: string;
        updatedAt?: string;
        userId?: string;
    } | null {
        try {
            const fields = this.splitCsvLine(line);

            if (fields.length < 1) {
                return null;
            }

            return {
                url: fields[0] || '',
                sourceAdapter: fields[1] || 'EmlFile',
                tags: fields[2] || '[]',
                summary: fields[3] || '',
                rawContent: fields[4] || '',
                createdAt: fields[5] || undefined,
                updatedAt: fields[6] || undefined,
                userId: fields[7] || undefined,
            };
        } catch {
            return null;
        }
    }

    /**
     * Split CSV line respecting quoted fields
     */
    private splitCsvLine(line: string): string[] {
        const fields: string[] = [];
        let currentField = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    currentField += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // Field separator
                fields.push(currentField);
                currentField = '';
            } else {
                currentField += char;
            }
        }

        // Add last field
        fields.push(currentField);

        return fields;
    }

    /**
     * Escape field for CSV (wrap in quotes if contains comma, quote, or newline)
     */
    private escapeCsvField(field: string): string {
        if (!field) {
            return '';
        }

        // Check if escaping is needed
        if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
            // Escape quotes by doubling them
            const escaped = field.replace(/"/g, '""');
            return `"${escaped}"`;
        }

        return field;
    }

    /**
     * Invalidate cache to force reload on next access
     */
    invalidateCache(): void {
        this.cache = null;
    }
}
