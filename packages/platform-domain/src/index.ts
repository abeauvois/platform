/**
 * Public entrypoint for the shared domain package.
 */

// Re-export all core infrastructure types (ILogger, IConfigProvider, tasks, workflows, etc.)
export * from '@abeauvois/platform-core'

// Domain Entities
export * from './domain/entities/BaseContent'
export * from './domain/entities/Bookmark'
export * from './domain/entities/EmailFile'
export * from './domain/entities/GmailMessage'
export * from './domain/entities/SourceAdapter'
export * from './domain/entities/PendingContent'
export * from './domain/entities/RawFile'

// Domain Ports
export * from './domain/ports/ILinkRepository'
export * from './domain/ports/IRateLimitedClient'
export * from './domain/ports/ISourceReader'
export * from './domain/ports/IPendingContentRepository'
export * from './domain/ports/IBookmarkEnricher'
export * from './domain/ports/IWebScraper'
export * from './domain/ports/IBrowserScraper'

// Application Services
export * from './application/services/GetBookmarksByUserIdService'
