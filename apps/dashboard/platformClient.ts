import { PlatformApiClient } from '@platform/sdk';

/**
 * Platform API client for the dashboard.
 *
 * Uses `credentials: 'include'` so the browser automatically sends
 * the better-auth session cookie with each request. No manual token
 * management is needed.
 *
 * @example
 * ```typescript
 * // In a React component with TanStack Query
 * const bookmarksQuery = useQuery({
 *     queryKey: ['bookmarks'],
 *     queryFn: () => platformClient.bookmarks.fetchAll(),
 * });
 * ```
 */
export const platformClient = new PlatformApiClient({
    baseUrl: '', // Same origin - browser will use current host
    credentials: 'include', // Browser sends cookies automatically
});
