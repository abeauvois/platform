ALTER TABLE "pending_content" ADD CONSTRAINT "pending_content_user_url_unique" UNIQUE ("user_id", "url");
