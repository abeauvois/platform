/**
 * ID Generator Port
 * Interface for generating unique identifiers
 */

export interface IIdGenerator {
    /**
     * Generate a unique identifier
     * @param prefix - Optional prefix for the ID
     * @returns A unique string identifier
     */
    generate(prefix?: string): string;
}
