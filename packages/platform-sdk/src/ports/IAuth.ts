/**
 * Domain port: Authentication interface
 * Defines contract for authentication operations
 */
export interface IAuth {
    /**
     * Authenticate user with email and password
     * @returns Session credentials or null if authentication fails
     */
    login(): Promise<AuthCredentials | null>;

    /**
     * Clear stored session
     */
    logout(): Promise<void>;
}

/**
 * Authentication credentials
 */
export interface AuthCredentials {
    sessionToken: string;
    userId: string;
    email: string;
}
