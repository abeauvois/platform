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
// Ingest/Workflow Types
// ============================================

/**
 * Available workflow presets
 */
export type WorkflowPreset = 'full' | 'quick' | 'analyzeOnly' | 'twitterFocus' | 'csvOnly' | 'gmail';

/**
 * Filter options for ingestion
 */
export interface IngestFilter {
    /** Filter by email address (for Gmail source) */
    email?: string;
}

/**
 * Options for the ingest method
 */
export interface IngestOptions {
    /** Filter criteria for source data */
    filter?: IngestFilter;
    /** Skip AI analysis step */
    skipAnalysis?: boolean;
    /** Skip Twitter enrichment step */
    skipTwitter?: boolean;
    /** Export to CSV only (no Notion) */
    csvOnly?: boolean;
}

/**
 * Logger interface for workflow hooks
 * Matches ILogger from @platform/domain
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
 * Lifecycle hooks for workflow execution
 */
export interface WorkflowExecuteOptions {
    /** Called when workflow starts */
    onStart?: (info: WorkflowHookInfo) => void | Promise<void>;
    /** Called when an error occurs */
    onError?: (info: WorkflowHookInfo) => void | Promise<void>;
    /** Called when workflow completes */
    onComplete?: (info: WorkflowHookInfo) => void | Promise<void>;
}

/**
 * Executable workflow returned by the ingest method
 */
export interface IIngestWorkflow {
    /** Execute the workflow with lifecycle hooks */
    execute(options?: WorkflowExecuteOptions): Promise<void>;
}
