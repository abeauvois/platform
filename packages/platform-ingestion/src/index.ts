/**
 * @abeauvois/platform-ingestion
 *
 * Content ingestion bounded context: source reading, normalization, and staging.
 * Provides domain entities, ports, and adapters for reading content from various
 * sources (Gmail, files, etc.) and staging it for processing.
 */

// Domain Entities
export * from './domain/entities/BaseContent.js';
export * from './domain/entities/PendingContent.js';
export * from './domain/entities/RawFile.js';
export * from './domain/entities/SourceAdapter.js';
export * from './domain/entities/GmailMessage.js';
export * from './domain/entities/EmailFile.js';

// Domain Ports
export * from './domain/ports/ISourceReader.js';
export * from './domain/ports/IPendingContentRepository.js';
export * from './domain/ports/IWebScraper.js';
export * from './domain/ports/IBrowserScraper.js';
export * from './domain/ports/IRateLimitedClient.js';
export * from './domain/ports/IEmailClient.js';
export * from './domain/ports/IUrlExtractor.js';
export * from './domain/ports/ITimestampRepository.js';

// Adapters
export * from './adapters/UrlExtractor.js';
export * from './adapters/InMemoryTimestampRepository.js';
export * from './adapters/gmail/GmailApiClient.js';
export * from './adapters/gmail/GmailSourceReader.js';
