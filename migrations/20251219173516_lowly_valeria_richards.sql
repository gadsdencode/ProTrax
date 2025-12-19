CREATE TYPE "public"."async_job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."async_job_type" AS ENUM('sow_extraction', 'report_generation', 'bulk_import');--> statement-breakpoint
CREATE TABLE "async_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" "async_job_type" NOT NULL,
	"status" "async_job_status" DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0,
	"progress_message" varchar(500),
	"input_data" jsonb,
	"result_data" jsonb,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "async_jobs" ADD CONSTRAINT "async_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_async_jobs_user_id" ON "async_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_async_jobs_status" ON "async_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_async_jobs_type" ON "async_jobs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_async_jobs_created_at" ON "async_jobs" USING btree ("created_at");