import JSZip from 'jszip';
import { readFileSync, statSync } from 'fs';
import { IZipExtractor } from '../../domain/ports/IZipExtractor.js';

/**
 * Adapter: Implements zip extraction using JSZip library
 * Supports multiple file extensions: .eml, .md, .text, .csv
 */
export class ZipExtractor implements IZipExtractor {
    private readonly ALLOWED_EXTENSIONS = ['eml', 'md', 'text', 'csv'];

    /**
     * Check if a filename has an allowed extension
     */
    private hasAllowedExtension(filename: string): boolean {
        const lowerFilename = filename.toLowerCase();
        return this.ALLOWED_EXTENSIONS.some(ext => lowerFilename.endsWith(`.${ext}`));
    }

    async extractFiles(zipFilePath: string): Promise<Map<string, string>> {
        // Validate that the path exists and is a file
        try {
            const stats = statSync(zipFilePath);
            if (!stats.isFile()) {
                throw new Error(`Path is not a file: ${zipFilePath}`);
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new Error(`File not found: ${zipFilePath}`);
            }
            throw error;
        }

        // Load and extract the zip file
        try {
            const buffer = readFileSync(zipFilePath);
            const zip = await JSZip.loadAsync(buffer);

            const files = new Map<string, string>();

            for (const [filename, zipEntry] of Object.entries(zip.files)) {
                // Only process files with allowed extensions (not directories)
                if (!zipEntry.dir && this.hasAllowedExtension(filename)) {
                    const content = await zipEntry.async('text');
                    files.set(filename, content);
                }
            }

            return files;
        } catch (error) {
            throw new Error(`Failed to extract zip file: ${zipFilePath}. ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
