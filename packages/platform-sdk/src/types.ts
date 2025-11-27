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
