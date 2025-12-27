// Export all schema tables
export * from './schema/index';

// Export database connection
export { db, pool } from './db';

// Re-export drizzle-orm utilities to ensure version consistency
export { eq, desc, and, or, sql, asc, ne, gt, gte, lt, lte, isNull, isNotNull, inArray, notInArray } from 'drizzle-orm';
