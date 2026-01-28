/**
 * Port: Timestamp repository interface
 * Tracks execution timestamps for incremental source reading
 */
export interface ITimestampRepository {
    /**
     * Get the last execution time
     * @returns The last execution timestamp, or null if never executed
     */
    getLastExecutionTime(): Promise<Date | null>;

    /**
     * Save the current execution time
     * @param timestamp The timestamp to save
     */
    saveLastExecutionTime(timestamp: Date): Promise<void>;
}
