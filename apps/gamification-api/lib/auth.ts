import { createAuth } from '@abeauvois/platform-auth';
import { db } from '@abeauvois/platform-db';
import * as schema from '@abeauvois/platform-db/schema';

// Build trusted origins from environment variables
const trustedOrigins = [
    process.env.CLIENT_URL, // Dashboard client
    process.env.TRADING_CLIENT_URL, // Trading client
    process.env.API_URL, // API server
    process.env.TRADING_SERVER_URL, // Trading server
].filter((url): url is string => Boolean(url));

export const auth = createAuth({
    db,
    schema,
    provider: 'pg',
    trustedOrigins,
});
