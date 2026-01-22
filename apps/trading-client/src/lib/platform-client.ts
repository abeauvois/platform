/**
 * Platform API Client Instance
 * Singleton client for platform operations (auth, settings) in the browser
 */
import { SettingsClient } from '@platform/sdk';
import { config } from './config';

/**
 * Singleton settings client instance.
 * Uses browser cookies for authentication with platform API.
 */
export const settingsClient = new SettingsClient({
    baseUrl: config.authApiUrl,
    // Use browser cookies for same-origin auth
    credentials: 'include',
});
