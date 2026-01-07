/**
 * Supported file types for content detection
 */
export type FileType = 'email' | 'csv' | 'json' | 'text' | 'markdown' | 'html' | 'article' | 'unknown';

/**
 * Generic file entity for directory/zip sources
 * Replaces EmailFile for non-email-specific file handling
 */
export interface RawFile {
    /** Original filename including extension */
    filename: string;
    /** Raw file content as string */
    content: string;
    /** File extension without dot (e.g., 'eml', 'csv') */
    extension: string;
    /** Inferred file type based on extension */
    fileType: FileType;
    /** File size in bytes */
    size: number;
}

/**
 * Extract file extension from filename
 * @param filename The filename to extract extension from
 * @returns Lowercase extension without dot, or empty string if none
 */
export function getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1 || lastDot === filename.length - 1) {
        return '';
    }
    return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Infer file type from filename extension
 * @param filename The filename to infer type from
 * @returns The detected FileType
 */
export function inferFileType(filename: string): FileType {
    const ext = getExtension(filename);
    switch (ext) {
        case 'eml':
            return 'email';
        case 'csv':
            return 'csv';
        case 'json':
            return 'json';
        case 'md':
        case 'markdown':
            return 'markdown';
        case 'html':
        case 'htm':
            return 'html';
        case 'txt':
            return 'text';
        default:
            return 'unknown';
    }
}

/**
 * Create a RawFile from filename and content
 * Automatically populates extension, fileType, and size
 */
export function createRawFile(filename: string, content: string): RawFile {
    return {
        filename,
        content,
        extension: getExtension(filename),
        fileType: inferFileType(filename),
        size: new Blob([content]).size,
    };
}
