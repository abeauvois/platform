/**
 * Port: Defines interface for extracting files from zip archives
 */
export interface IZipExtractor {
    /**
     * Extracts files from a zip archive
     * @param zipFilePath Path to the zip file
     * @returns Map of filename to file content
     */
    extractFiles(zipFilePath: string): Promise<Map<string, string>>;
}
