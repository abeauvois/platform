-- Web app specific tables only
-- Authentication tables (user, session, account, verification) are managed by packages/platform-db

CREATE TABLE "todos" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
    "user_id" text NOT NULL,
    "title" varchar(500) NOT NULL,
    "subtitle" varchar(500),
    "description" varchar(1000),
    "completed" boolean DEFAULT false,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "todos"
ADD CONSTRAINT "todos_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user" ("id") ON DELETE cascade ON UPDATE no action;