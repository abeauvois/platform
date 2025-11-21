import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { IDirectoryReader } from '../../domain/ports/IDirectoryReader.js';

/**
 * Directory Reader Adapter
 * Implements file system operations for reading directory contents
 */
export class DirectoryReader implements IDirectoryReader {
    /**
     * Read all files from a directory
     * @param directoryPath - Path to the directory
     * @param recursive - Whether to scan recursively (default: false)
     * @param filePattern - Optional glob pattern to filter files (e.g., "*.eml")
     * @returns Map of filename to file content
     */
    async readFiles(
        directoryPath: string,
        recursive: boolean = false,
        filePattern?: string
    ): Promise<Map<string, string>> {
        const files = new Map<string, string>();

        // Validate directory exists and is a directory
        try {
            const stats = statSync(directoryPath);
            if (!stats.isDirectory()) {
                throw new Error(`Path is not a directory: ${directoryPath}`);
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new Error(`Directory not found: ${directoryPath}`);
            }
            throw error;
        }

        // Read files
        this.readFilesRecursive(directoryPath, directoryPath, files, recursive, filePattern);

        return files;
    }

    /**
     * Internal recursive file reader
     */
    private readFilesRecursive(
        basePath: string,
        currentPath: string,
        files: Map<string, string>,
        recursive: boolean,
        filePattern?: string
    ): void {
        const entries = readdirSync(currentPath);

        for (const entry of entries) {
            const fullPath = join(currentPath, entry);
            const stats = statSync(fullPath);

            if (stats.isDirectory()) {
                // Recurse into subdirectories if recursive mode enabled
                if (recursive) {
                    this.readFilesRecursive(basePath, fullPath, files, recursive, filePattern);
                }
            } else if (stats.isFile()) {
                // Check if file matches pattern (if provided)
                if (filePattern && !this.matchesPattern(entry, filePattern)) {
                    continue;
                }

                // Read file content
                const content = readFileSync(fullPath, 'utf-8');

                // Store with relative path from base directory
                const relativePath = fullPath.replace(basePath + '/', '');
                files.set(relativePath, content);
            }
        }
    }

    /**
     * Simple glob pattern matcher
     * Supports basic wildcards like "*.eml"
     */
    private matchesPattern(filename: string, pattern: string): boolean {
        // Convert glob pattern to regex
        // Support: *.ext, prefix*, *suffix, *middle*
        const regexPattern = pattern
            .replace(/\./g, '\\.')  // Escape dots
            .replace(/\*/g, '.*');   // Convert * to .*

        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(filename);
    }
}
