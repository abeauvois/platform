import { Hono } from 'hono'
import type { HonoEnv } from '../types'
import { createBookmarkValidator } from '../validators/create-bookmark.validator'
import { authMiddleware } from '@/middlewares/auth.middleware'
import {
  InMemoryBookmarkRepository,
  Bookmark,
  GetBookmarksByUserIdService,
} from '@platform/domain'

const repository = new InMemoryBookmarkRepository()
const getBookmarksByUserIdService = new GetBookmarksByUserIdService(repository)

/**
 * Get bookmarks for a specific user
 * @param userId - The ID of the user whose bookmarks to retrieve
 * @returns Promise resolving to array of user's bookmarks
 */
async function getBookmarksByUserId(userId: string): Promise<Bookmark[]> {
  return await getBookmarksByUserIdService.execute(userId);
}

export const bookmarks = new Hono<HonoEnv>()
  .use(authMiddleware)
  .post(
    '/',
    createBookmarkValidator,
    async (c) => {
      const user = c.get('user');
      const { url, sourceAdapter, tags = [], summary = '' } = c.req.valid('json')

      const bookmark = new Bookmark(
        url,
        sourceAdapter,
        tags,
        summary,
        '', // rawContent
        new Date(), // createdAt
        new Date(), // updatedAt
        user.id // userId
      )

      if (!bookmark.isValid()) {
        const errors: string[] = [];

        if (!bookmark.url || bookmark.url.length === 0) {
          errors.push('url: URL is required and cannot be empty');
        }

        if (bookmark.sourceAdapter === 'None') {
          errors.push('sourceAdapter: Source adapter cannot be "None". Please specify a valid source adapter (e.g., "Other", "EmlFile", "Gmail", etc.)');
        }

        return c.json({
          error: 'Invalid bookmark data',
          validation_errors: errors,
          fields: {
            url: bookmark.url,
            sourceAdapter: bookmark.sourceAdapter,
            tags: bookmark.tags,
            summary: bookmark.summary
          }
        }, 400)
      }

      const savedBookmark = await repository.save(bookmark)

      return c.json(savedBookmark, 201)
    },
  )

  .patch('/:id', async (c) => {
    const user = c.get('user');
    const bookmarkId = c.req.param('id');
    const updates = await c.req.json();

    try {
      const updatedBookmark = await repository.update(bookmarkId, user.id, updates);
      if (!updatedBookmark) {
        return c.json({ error: 'Bookmark not found' }, 404);
      }
      return c.json(updatedBookmark);
    } catch (error) {
      console.error('Error updating bookmark: ', error);
      return c.json({ error: 'Failed to update bookmark' }, 500);
    }
  })

  .delete('/:id', async (c) => {
    const user = c.get('user');
    const bookmarkId = c.req.param('id');

    try {
      const deleted = await repository.delete(bookmarkId, user.id);
      if (!deleted) {
        return c.json({ error: 'Bookmark not found' }, 404);
      }
      return c.json({ success: true });
    } catch (error) {
      console.error('Error deleting bookmark: ', error);
      return c.json({ error: 'Failed to delete bookmark' }, 500);
    }
  })

  .get('/', async (c) => {
    const user = c.get('user');

    try {
      const bookmarks = await getBookmarksByUserId(user.id);
      return c.json(bookmarks as Bookmark[]);
    } catch (error) {
      console.error('Failed to fetch bookmarks: ', error);
      return c.json({ error: 'Failed to fetch bookmarks' }, 500);
    }
  })
