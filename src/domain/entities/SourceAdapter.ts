/**
 * Source adapter type system using string literal union
 * Replaces enum for better TypeScript patterns and extensibility
 */

/**
 * Array of all valid source adapter values
 * Used for runtime validation and as source of truth
 */
export const SOURCE_ADAPTERS = [
    'Gmail',
    'Outlook',
    'EmlFile',
    'ZipFile',
    'Directory',
    'NotionDatabase',
    'Other',
    'None'
] as const;

/**
 * String literal union type for source adapters
 * Provides compile-time type safety
 */
export type SourceAdapter = typeof SOURCE_ADAPTERS[number];

/**
 * Type guard to validate if a value is a valid SourceAdapter
 * Use this at boundaries (API inputs, file parsing, etc.)
 * 
 * @param value - The value to check
 * @returns true if value is a valid SourceAdapter, false otherwise
 * 
 * @example
 * ```typescript
 * const jsonData = JSON.parse(input);
 * if (isValidSourceAdapter(jsonData.source)) {
 *   // TypeScript knows jsonData.source is SourceAdapter here
 *   const source: SourceAdapter = jsonData.source;
 * }
 * ```
 */
export function isValidSourceAdapter(value: unknown): value is SourceAdapter {
    return typeof value === 'string' &&
        SOURCE_ADAPTERS.includes(value as SourceAdapter);
}
