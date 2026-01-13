-- Create user trading settings table
CREATE TABLE IF NOT EXISTS user_trading_settings (
    user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
    default_account_mode VARCHAR(10) NOT NULL DEFAULT 'spot',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
