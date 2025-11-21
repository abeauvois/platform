/**
 * Port for reading files from a directory
 * Abstracts file system operations for directory scanning
 */
export interface IDirectoryReader {
    /**
     * Read all files from a directory
     * @param directoryPath - Path to the directory
     * @param recursive - Whether to scan recursively (default: false)
     * @param filePattern - Optional glob pattern to filter files (e.g., "*.eml")
     * @returns Map of filename to file content
     */
    readFiles(
        directoryPath: string,
        recursive?: boolean,
        filePattern?: string
    ): Promise<Map<string, string>>;
}
