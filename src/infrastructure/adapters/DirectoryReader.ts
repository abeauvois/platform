import JSZip from 'jszip';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'node:path';
import { IDirectoryReader } from '../../domain/ports/IDirectoryReader.js';
import { RawFile, createRawFile } from '../../domain/entities/RawFile.js';

/**
 * Directory Reader Adapter
 * Implements file system operations for reading files from directories or zip archives
 */
export class DirectoryReader implements IDirectoryReader {
    private readonly ALLOWED_ZIP_EXTENSIONS = ['eml', 'md', 'text', 'csv', 'txt', 'json'];

    /**
     * Read all files from a directory or zip archive
     * @param sourcePath - Path to the directory or zip file
     * @param recursive - Whether to scan recursively (default: false, only applies to directories)
     * @param filePattern - Optional glob pattern to filter files (e.g., "*.eml")
     * @returns Array of RawFile objects with file metadata and content
     */
    async readFiles(
        sourcePath: string,
        recursive: boolean = false,
        filePattern?: string
    ): Promise<RawFile[]> {
        if (this.isZipFile(sourcePath)) {
            return this.readFilesFromZip(sourcePath, filePattern);
        }
        return this.readFilesFromDirectory(sourcePath, recursive, filePattern);
    }

    private isZipFile(path: string): boolean {
        try {
            const stats = statSync(path);
            return stats.isFile() && path.toLowerCase().endsWith('.zip');
        } catch {
            return false;
        }
    }

    private async readFilesFromZip(zipPath: string, filePattern?: string): Promise<RawFile[]> {
        try {
            const stats = statSync(zipPath);
            if (!stats.isFile()) {
                throw new Error(`Path is not a file: ${zipPath}`);
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new Error(`File not found: ${zipPath}`);
            }
            throw error;
        }

        const buffer = readFileSync(zipPath);
        const zip = await JSZip.loadAsync(buffer);
        const files: RawFile[] = [];

        for (const [filename, zipEntry] of Object.entries(zip.files)) {
            if (zipEntry.dir) continue;
            if (!this.hasAllowedZipExtension(filename)) continue;
            if (filePattern && !this.matchesPattern(filename, filePattern)) continue;

            const content = await zipEntry.async('text');
            files.push(createRawFile(filename, content));
        }

        return files;
    }

    private hasAllowedZipExtension(filename: string): boolean {
        const ext = extname(filename).slice(1).toLowerCase();
        return this.ALLOWED_ZIP_EXTENSIONS.includes(ext);
    }

    private async readFilesFromDirectory(
        directoryPath: string,
        recursive: boolean,
        filePattern?: string
    ): Promise<RawFile[]> {
        const files: RawFile[] = [];

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

        this.readFilesRecursive(directoryPath, directoryPath, files, recursive, filePattern);
        return files;
    }

    /**
     * Internal recursive file reader
     */
    private readFilesRecursive(
        basePath: string,
        currentPath: string,
        files: RawFile[],
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
                files.push(createRawFile(relativePath, content));
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
