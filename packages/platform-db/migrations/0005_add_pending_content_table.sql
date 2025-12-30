CREATE TABLE "pending_content" (
    "id" varchar(100) PRIMARY KEY,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "url" text NOT NULL,
    "source_adapter" varchar(50) NOT NULL DEFAULT 'None',
    "external_id" varchar(255),
    "raw_content" text NOT NULL DEFAULT '',
    "content_type" varchar(50) NOT NULL DEFAULT 'unknown',
    "status" varchar(20) NOT NULL DEFAULT 'pending',
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "pending_content_status_idx" ON "pending_content" ("status");
CREATE INDEX "pending_content_user_id_idx" ON "pending_content" ("user_id");
CREATE UNIQUE INDEX "pending_content_external_id_idx"
    ON "pending_content" ("user_id", "source_adapter", "external_id")
    WHERE "external_id" IS NOT NULL;
