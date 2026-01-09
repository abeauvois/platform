/**
 * ID Generator Port
 * Interface for generating unique identifiers
 */

/**
 * ID generator interface for creating unique IDs
 */
export interface IIdGenerator {
    /**
     * Generate a unique identifier
     * @returns A unique string identifier
     */
    generate(): string;
}
