CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"theme" varchar(10) DEFAULT 'system' NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"trading_account_mode" varchar(10) DEFAULT 'spot',
	"trading_reference_timestamp" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Migrate existing data from user_trading_settings to user_settings
INSERT INTO user_settings (user_id, trading_account_mode, trading_reference_timestamp, created_at, updated_at)
SELECT user_id, default_account_mode, global_reference_timestamp, created_at, updated_at
FROM user_trading_settings
ON CONFLICT (user_id) DO UPDATE SET
    trading_account_mode = EXCLUDED.trading_account_mode,
    trading_reference_timestamp = EXCLUDED.trading_reference_timestamp;