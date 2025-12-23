/**
 * Public entrypoint for the shared domain package.
 * For now, this re-exports from the existing `src/domain` location.
 * Later you can move the actual domain source into `packages/domain/src`.
 *
 * Keep this surface minimal and grow it as needed.
 */
// Entities
export * from '../../../src/domain/entities/Bookmark';
export * from '../../../src/domain/entities/EmailFile';
export * from '../../../src/domain/entities/GmailMessage';
export * from '../../../src/domain/entities/SourceAdapter';
// Core ports commonly needed across apps
export * from '../../../src/domain/ports/IConfigProvider';
export * from '../../../src/domain/ports/ILinkRepository';
export * from '../../../src/domain/ports/ILogger';
// Repositories
export * from '../../../src/infrastructure/repositories/InMemoryBookmarkRepository';
// Application Services
export * from '../../../src/application/services/GetBookmarksByUserIdService';
