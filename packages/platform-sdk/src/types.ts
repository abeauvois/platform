/**
 * API Types for Platform SDK
 * Request and response types for platform API operations
 */

/**
 * Sign up request data
 */
export interface SignUpData {
    email: string;
    password: string;
    name: string;
}

/**
 * Sign in request data
 */
export interface SignInData {
    email: string;
    password: string;
}

/**
 * Authentication response
 * Contains session token and user information
 */
export interface AuthResponse {
    sessionToken: string;
    userId: string;
    email: string;
}

/**
 * Bookmark creation/update data
 */
export interface BookmarkData {
    url: string;
    sourceAdapter: string;
    tags: string[];
    summary?: string;
}

/**
 * Configuration response from API
 */
export interface ConfigResponse {
    userId: string;
    config: Record<string, string>;
    keys: string[];
}

/**
 * Single config value response
 */
export interface ConfigValueResponse {
    key: string;
    value: string;
}

/**
 * Batch config request
 */
export interface ConfigBatchRequest {
    keys: string[];
}

/**
 * Batch config response
 */
export interface ConfigBatchResponse {
    config: Record<string, string>;
    found: string[];
    missing: string[];
}

/**
 * Available config keys response
 */
export interface ConfigKeysResponse {
    keys: string[];
    total: number;
}

// ============================================
// Workflow Types
// ============================================

/**
 * Available workflow presets
 */
export type WorkflowPreset = 'analyzeOnly' | 'twitterFocus' | 'csvOnly' | 'gmail' | 'bookmark' | 'bookmarkEnrichment';

/**
 * Available destinations for saving processed items
 */
export const SAVE_TO_DESTINATIONS = ['console', 'database', 'csv', 'notion', 'bookmarks'] as const;
export type SaveToDestination = typeof SAVE_TO_DESTINATIONS[number];

/**
 * Filter options for workflow
 */
export interface WorkflowFilter {
    /** Filter by email address (for Gmail source) */
    email?: string;
    /** Limit to items from the last N days */
    limitDays?: number;
    /** Include URL in processed items output */
    withUrl?: boolean;
}

/**
 * Options for the workflow method
 */
export interface WorkflowOptions {
    /** Filter criteria for source data */
    filter?: WorkflowFilter;
    /** Skip AI analysis step */
    skipAnalysis?: boolean;
    /** Skip Twitter enrichment step */
    skipTwitter?: boolean;
    /** Export to CSV only (no Notion) */
    csvOnly?: boolean;
    /** Where to save processed items (default: 'console') */
    saveTo?: SaveToDestination;
}

/**
 * Logger interface for workflow hooks
 * Matches ILogger from @abeauvois/platform-domain
 */
export interface ILogger {
    info(message: string, options?: { prefix?: string; suffix?: string }): void;
    warning(message: string, options?: { prefix?: string; suffix?: string }): void;
    error(message: string, options?: { prefix?: string; suffix?: string }): void;
    debug(message: string, options?: { prefix?: string; suffix?: string }): void;
    await(message: string, options?: { prefix?: string; suffix?: string }): {
        start(): void;
        update(message: string, options?: { prefix?: string; suffix?: string }): void;
        stop(): void;
    };
}

/**
 * Information passed to workflow lifecycle hooks
 */
export interface WorkflowHookInfo {
    /** Logger instance for outputting messages */
    logger: ILogger;
}

/**
 * Information about a processed item (for SDK polling-based workflows)
 */
export interface ItemProcessedInfo {
    /** Index of the item (0-based) */
    index: number;
    /** Total number of items being processed */
    total: number;
    /** Name of the step that processed the item */
    stepName: string;
    /** Whether the item was processed successfully */
    success: boolean;
    /** Error message if processing failed */
    error?: string;
}

/**
 * Information passed to the onComplete hook
 */
export interface WorkflowCompleteInfo {
    /** Logger instance for outputting messages */
    logger: ILogger;
    /** Execution statistics */
    stats: {
        /** Total number of items processed */
        itemsProcessed: number;
        /** Number of items created */
        itemsCreated: number;
        /** Duration of the workflow in milliseconds */
        durationMs: number;
        /** Whether the workflow completed successfully */
        success: boolean;
        /** Any errors that occurred */
        errors: string[];
    };
    /** All items that were processed (available when workflow completes) */
    processedItems: ProcessedItem[];
}

/**
 * Represents a processed item returned by the API
 */
export interface ProcessedItem {
    /** Unique identifier */
    id: string;
    /** URL of the bookmark */
    url: string;
    /** Source adapter that extracted the bookmark */
    sourceAdapter: string;
    /** Tags assigned to the bookmark */
    tags: string[];
    /** Summary of the bookmark content */
    summary?: string;
    /** Raw content of the bookmark */
    rawContent?: string;
}

/**
 * Lifecycle hooks for workflow execution
 */
export interface WorkflowExecuteOptions {
    /** Called when workflow starts */
    onStart?: (info: WorkflowHookInfo) => void | Promise<void>;
    /** Called when an item is processed (polled from server) */
    onItemProcessed?: (info: ItemProcessedInfo) => void | Promise<void>;
    /** Called when an error occurs */
    onError?: (info: WorkflowHookInfo) => void | Promise<void>;
    /** Called when workflow completes with all processed items */
    onComplete?: (info: WorkflowCompleteInfo) => void | Promise<void>;
}

/**
 * Executable workflow returned by the workflow client
 */
export interface IWorkflow {
    /** Execute the workflow with lifecycle hooks */
    execute(options?: WorkflowExecuteOptions): Promise<void>;
}
