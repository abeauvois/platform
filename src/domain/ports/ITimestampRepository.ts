/**
 * Port: ITimestampRepository
 * 
 * Interface for persisting and retrieving the last execution timestamp.
 * This allows the system to track when the gmail command was last run.
 * 
 * Following Hexagonal Architecture - Domain defines the interface,
 * Infrastructure provides the implementation.
 */

export interface ITimestampRepository {
    /**
     * Get the last execution timestamp
     * @returns The last execution date, or null if never executed
     */
    getLastExecutionTime(): Promise<Date | null>;

    /**
     * Save the current execution timestamp
     * @param timestamp - The timestamp to save
     */
    saveLastExecutionTime(timestamp: Date): Promise<void>;
}
