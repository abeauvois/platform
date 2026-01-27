/**
 * Gamification Integration
 * Optional integration with the gamification-api for credit checks
 */

import { GamificationApiClient } from '@abeauvois/platform-gamification-sdk';
import { env } from '../env';

/**
 * Create gamification client if GAMIFICATION_API_URL is set
 * Returns null if gamification is not configured
 */
export function createGamificationClient(getToken: () => string | null): GamificationApiClient | null {
    if (!env.GAMIFICATION_API_URL) {
        return null;
    }

    return new GamificationApiClient({
        baseUrl: env.GAMIFICATION_API_URL,
        getToken,
    });
}

/**
 * Check if gamification is enabled
 */
export function isGamificationEnabled(): boolean {
    return Boolean(env.GAMIFICATION_API_URL);
}
