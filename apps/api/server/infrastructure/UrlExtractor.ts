/** URL regex pattern for detecting HTTP/HTTPS URLs */
const URL_REGEX = /(https?:\/\/[^\s<>"')\]]+)/g;

/**
 * Port: IUrlExtractor interface
 */
export interface IUrlExtractor {
    containsUrl(content: string): boolean;
    extractFirst(content: string): string;
}

/**
 * URL extraction utility for finding URLs in text content
 */
export class UrlExtractor implements IUrlExtractor {
    /**
     * Check if content contains a URL
     */
    containsUrl(content: string): boolean {
        URL_REGEX.lastIndex = 0;
        return URL_REGEX.test(content);
    }

    /**
     * Extract first URL from content
     */
    extractFirst(content: string): string {
        URL_REGEX.lastIndex = 0;
        const match = URL_REGEX.exec(content);
        return match ? match[0] : '';
    }
}
