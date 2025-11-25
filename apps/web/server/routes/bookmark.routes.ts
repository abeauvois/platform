import { Hono } from 'hono'
import type { HonoEnv } from '../types'
import { createBookmarkValidator } from '../validators/create-bookmark.validator'
import { InMemoryBookmarkRepository } from '../../../../src/infrastructure/repositories/InMemoryBookmarkRepository.js'
import { Bookmark } from '../../../../src/domain/entities/Bookmark'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { GetBookmarksByUserIdService } from '../../../../src/application/services/GetBookmarksByUserIdService.js'

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

      await repository.save(bookmark)

      return c.json(bookmark, 201)
    },
  )

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
