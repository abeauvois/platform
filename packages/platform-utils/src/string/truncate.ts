/** Default suffix to append to truncated text */
const DEFAULT_SUFFIX = '...';

/** Default threshold for word boundary (70% of truncation point) */
const DEFAULT_WORD_BOUNDARY_THRESHOLD = 0.7;

/**
 * Truncate text to a maximum length, trying to break at word boundaries.
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length of the result (including suffix)
 * @param suffix - Suffix to append when truncated (default: "...")
 * @param wordBoundaryThreshold - Percentage of truncation point to look back for word boundary (default: 0.7)
 * @returns The truncated text with suffix, or original text if under maxLength
 *
 * @example
 * truncateText('Hello beautiful world', 15) // 'Hello...'
 * truncateText('Hello World', 20) // 'Hello World' (no truncation needed)
 * truncateText('Hello World', 8, '…') // 'Hello…'
 */
export function truncateText(
    text: string,
    maxLength: number,
    suffix: string = DEFAULT_SUFFIX,
    wordBoundaryThreshold: number = DEFAULT_WORD_BOUNDARY_THRESHOLD
): string {
    if (text.length <= maxLength) {
        return text;
    }

    const truncateAt = maxLength - suffix.length;

    // Handle edge case where maxLength is too small for suffix
    if (truncateAt <= 0) {
        return suffix.slice(0, maxLength);
    }

    const truncated = text.slice(0, truncateAt);

    // Try to break at last space to avoid cutting words
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > truncateAt * wordBoundaryThreshold) {
        return truncated.slice(0, lastSpace) + suffix;
    }

    return truncated + suffix;
}
