/**
 * Browser-safe exports from platform-domain
 * Does NOT include @abeauvois/platform-task or any Node.js-specific code
 */

// Re-export browser-safe ingestion types
export * from '@abeauvois/platform-ingestion/browser';

// Entities (browser-safe types and constants only)
export * from './domain/entities/Bookmark';

// Core ports (interfaces only, no implementations or Node.js deps)
export type { IConfigProvider } from '@abeauvois/platform-core';
export type { ILogger } from '@abeauvois/platform-core';
