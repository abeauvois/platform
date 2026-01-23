CREATE TABLE "credit_transactions" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" varchar(30) NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reference_id" varchar(100),
	"reference_type" varchar(30),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"stripe_payment_intent_id" varchar(100) NOT NULL,
	"amount_eur" integer NOT NULL,
	"credits_granted" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_credit_balance" (
	"user_id" text PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 50 NOT NULL,
	"lifetime_spent" integer DEFAULT 0 NOT NULL,
	"tier" varchar(20) DEFAULT 'free' NOT NULL,
	"last_activity_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_daily_activity" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"activity_date" date NOT NULL,
	"charged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activity_type" varchar(30) DEFAULT 'api_call' NOT NULL,
	CONSTRAINT "user_daily_activity_user_date_unique" UNIQUE("user_id","activity_date")
);
--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credit_balance" ADD CONSTRAINT "user_credit_balance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_daily_activity" ADD CONSTRAINT "user_daily_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_transactions_user_id_idx" ON "credit_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_transactions_created_at_idx" ON "credit_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "credit_transactions_reference_idx" ON "credit_transactions" USING btree ("reference_id","reference_type");--> statement-breakpoint
CREATE INDEX "payments_user_id_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_stripe_intent_idx" ON "payments" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "user_daily_activity_user_id_idx" ON "user_daily_activity" USING btree ("user_id");