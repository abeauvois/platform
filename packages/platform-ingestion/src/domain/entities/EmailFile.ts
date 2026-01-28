/**
 * Represents an email file extracted from a source (zip, directory, etc.)
 */
export interface EmailFile {
    /**
     * The filename of the email (e.g., "example.eml")
     */
    filename: string;

    /**
     * The raw content of the email file
     */
    content: string;
}
