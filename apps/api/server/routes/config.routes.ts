import { Hono } from 'hono'
import type { HonoEnv } from '../types'
import { authMiddleware } from '@/middlewares/auth.middleware'

/**
 * Configuration keys that can be served to authenticated clients.
 * These are loaded from environment variables on the server.
 *
 * SECURITY: Only expose keys that are safe for authenticated users.
 * Never expose database credentials or auth secrets.
 */
const ALLOWED_CONFIG_KEYS = [
  // Anthropic AI
  'ANTHROPIC_API_KEY',

  // Notion Integration
  'NOTION_INTEGRATION_TOKEN',
  'NOTION_DATABASE_ID',

  // Twitter Integration
  'TWITTER_BEARER_TOKEN',

  // Gmail OAuth
  'GMAIL_CLIENT_ID',
  'GMAIL_CLIENT_SECRET',
  'GMAIL_REFRESH_TOKEN',

  // User-specific
  'MY_EMAIL_ADDRESS',
] as const

type ConfigKey = (typeof ALLOWED_CONFIG_KEYS)[number]

interface ConfigResponse {
  [key: string]: string | undefined
}

/**
 * Get all allowed config values from environment
 */
function getAllConfig(): ConfigResponse {
  const config: ConfigResponse = {}
  for (const key of ALLOWED_CONFIG_KEYS) {
    const value = process.env[key]
    if (value) {
      config[key] = value
    }
  }
  return config
}

/**
 * Get specific config values from environment
 */
function getConfigByKeys(keys: string[]): ConfigResponse {
  const config: ConfigResponse = {}
  for (const key of keys) {
    if (ALLOWED_CONFIG_KEYS.includes(key as ConfigKey)) {
      const value = process.env[key]
      if (value) {
        config[key] = value
      }
    }
  }
  return config
}

export const config = new Hono<HonoEnv>()
  .use(authMiddleware)

  /**
   * GET /api/config
   * Returns all available configuration values for the authenticated user
   */
  .get('/', async (c) => {
    const user = c.get('user')

    try {
      const configValues = getAllConfig()

      return c.json({
        userId: user.id,
        config: configValues,
        keys: Object.keys(configValues),
      })
    } catch (error) {
      console.error('Error fetching config:', error)
      return c.json({ error: 'Failed to fetch configuration' }, 500)
    }
  })

  /**
   * GET /api/config/keys
   * Returns list of available configuration keys (without values)
   */
  .get('/keys', async (c) => {
    const availableKeys = ALLOWED_CONFIG_KEYS.filter((key) => process.env[key])

    return c.json({
      keys: availableKeys,
      total: availableKeys.length,
    })
  })

  /**
   * POST /api/config/batch
   * Returns multiple configuration values by keys
   * Body: { keys: ["KEY1", "KEY2", ...] }
   */
  .post('/batch', async (c) => {
    const body = await c.req.json<{ keys?: string[] }>()

    if (!body.keys || !Array.isArray(body.keys)) {
      return c.json({ error: 'Request body must include "keys" array' }, 400)
    }

    const configValues = getConfigByKeys(body.keys)
    const missingKeys = body.keys.filter(
      (key) => !Object.prototype.hasOwnProperty.call(configValues, key)
    )

    return c.json({
      config: configValues,
      found: Object.keys(configValues),
      missing: missingKeys,
    })
  })

  /**
   * GET /api/config/:key
   * Returns a specific configuration value
   */
  .get('/:key', async (c) => {
    const key = c.req.param('key')

    if (!ALLOWED_CONFIG_KEYS.includes(key as ConfigKey)) {
      return c.json({ error: `Configuration key '${key}' is not available` }, 404)
    }

    const value = process.env[key]

    if (!value) {
      return c.json({ error: `Configuration key '${key}' is not set` }, 404)
    }

    return c.json({
      key,
      value,
    })
  })
