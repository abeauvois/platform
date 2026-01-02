/**
 * Platform SDK CLI
 * CLI-specific adapters for the Platform SDK
 *
 * This package provides adapters for CLI/server environments that require
 * file-based storage, .env file loading, or terminal output.
 */

// Session Storage
export { FileSessionStorage, type StoredSession } from './adapters/FileSessionStorage';

// Config Provider
export { EnvConfigProvider } from './adapters/EnvConfigProvider';

// Logger
export { CliuiLogger } from './adapters/CliuiLogger';

// Auth Manager
export { AuthManager, type AuthManagerConfig } from './AuthManager';

// Re-export types from core SDK for convenience
export type { ISessionStorage, AuthResponse } from '@platform/sdk';
