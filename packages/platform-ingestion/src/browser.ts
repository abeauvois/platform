/**
 * Browser-safe exports from platform-ingestion
 * Does NOT include Node.js-specific adapters (Gmail, file system, etc.)
 */

// Entities (browser-safe types and constants only)
export * from './domain/entities/BaseContent.js';
export * from './domain/entities/SourceAdapter.js';
export * from './domain/entities/RawFile.js';

// Ports (interfaces only, no implementations or Node.js deps)
export type { ISourceReader, SourceReaderConfig } from './domain/ports/ISourceReader.js';
export type { IUrlExtractor } from './domain/ports/IUrlExtractor.js';
