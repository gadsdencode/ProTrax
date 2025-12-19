import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

/**
 * Drizzle Kit Configuration
 * 
 * This configuration uses proper database migrations instead of push for:
 * - Version-controlled schema history
 * - Safe team collaboration
 * - Rollback capabilities
 * - Production-safe deployments
 * 
 * Commands:
 * - npm run db:generate - Generate migration files from schema changes
 * - npm run db:migrate - Apply pending migrations to the database
 * - npm run db:studio - Open Drizzle Studio for database inspection
 * - npm run db:push - (Development only) Push schema directly without migrations
 */
export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Migration settings
  migrations: {
    prefix: "timestamp", // Uses timestamps for migration ordering
    table: "__drizzle_migrations", // Table to track applied migrations
    schema: "public",
  },
  // Enable verbose logging in development
  verbose: process.env.NODE_ENV === "development",
  // Strict mode for safer migrations
  strict: true,
});
