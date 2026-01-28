// Re-export Gmail source reader from ingestion package
export { createGmailSourceReader } from '@abeauvois/platform-ingestion';

// Local source readers (depend on API server infrastructure)
export { createBookmarkSourceReader } from './BookmarkSourceReader';
