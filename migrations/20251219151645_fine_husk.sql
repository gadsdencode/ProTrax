CREATE TYPE "public"."user_role" AS ENUM('admin', 'project_manager', 'member', 'viewer');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'member';