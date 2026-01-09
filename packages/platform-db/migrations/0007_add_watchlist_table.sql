-- Create watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
    id VARCHAR(100) PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT watchlist_user_symbol_unique UNIQUE (user_id, symbol)
);

-- Create index for fast lookup by user_id
CREATE INDEX IF NOT EXISTS watchlist_user_id_idx ON watchlist(user_id);
