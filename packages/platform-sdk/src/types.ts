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
