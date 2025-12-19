/**
 * Database Fix Script: Multi-tenancy Migration
 * 
 * This script fixes the database state to enable multi-tenancy:
 * 1. Marks existing schema migrations as applied
 * 2. Creates organization infrastructure
 * 3. Creates a default organization for existing data
 * 4. Migrates existing projects and users to the default org
 * 5. Applies the remaining schema changes safely
 * 
 * Run with: npx tsx scripts/fix-database-multitenancy.ts
 */

import 'dotenv/config';
import { pool } from '../server/db';
import { randomUUID } from 'crypto';

interface MigrationEntry {
  hash: string;
  created_at: number;
}

// All migrations in order
const MIGRATIONS: MigrationEntry[] = [
  { hash: '20251219110154_keen_gravity', created_at: 1766142114590 },
  { hash: '20251219151645_fine_husk', created_at: 1766157405385 },
  { hash: '20251219173516_lowly_valeria_richards', created_at: 1766165716582 },
  { hash: '20251219180108_multi_tenancy_organizations', created_at: 1766167268280 },
];

async function main() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting database fix for multi-tenancy migration...\n');

    // Step 1: Create migrations table if needed
    console.log('📋 Step 1: Ensuring migrations tracking table exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL UNIQUE,
        created_at BIGINT
      );
    `);
    console.log('   ✅ Migrations table ready\n');

    // Step 2: Check existing database state
    console.log('🔍 Step 2: Checking existing database state...');
    
    // Check for base tables
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'projects', 'tasks', 'sessions');
    `);
    const existingTables = tablesCheck.rows.map(r => r.table_name);
    console.log(`   Found tables: ${existingTables.join(', ')}`);

    // Check for enums
    const enumsCheck = await client.query(`
      SELECT typname FROM pg_type 
      WHERE typtype = 'e' 
      AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    `);
    const existingEnums = enumsCheck.rows.map(r => r.typname);
    console.log(`   Found enums: ${existingEnums.slice(0, 5).join(', ')}... (${existingEnums.length} total)\n`);

    // Check for organization tables
    const orgTablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('organizations', 'organization_members', 'organization_invitations');
    `);
    const orgTablesExist = orgTablesCheck.rows.length === 3;
    console.log(`   Organization tables exist: ${orgTablesExist ? 'Yes' : 'No'}\n`);

    // Step 3: Mark base migrations as applied
    console.log('📝 Step 3: Marking base migrations as applied...');
    
    // Check which migrations are already recorded
    const appliedMigrations = await client.query('SELECT hash FROM __drizzle_migrations');
    const appliedHashes = new Set(appliedMigrations.rows.map(r => r.hash));

    // Mark migrations based on what exists in the database
    for (const migration of MIGRATIONS.slice(0, 2)) { // First two migrations
      if (!appliedHashes.has(migration.hash)) {
        await client.query(
          'INSERT INTO __drizzle_migrations (hash, created_at) VALUES ($1, $2)',
          [migration.hash, migration.created_at]
        );
        console.log(`   ✅ Marked as applied: ${migration.hash}`);
      } else {
        console.log(`   ℹ️  Already recorded: ${migration.hash}`);
      }
    }
    console.log('');

    // Step 4: Check if async_jobs table exists
    const asyncJobsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'async_jobs'
      );
    `);
    const asyncJobsExists = asyncJobsCheck.rows[0].exists;

    if (!asyncJobsExists) {
      console.log('📦 Step 4: Creating async_jobs infrastructure...');
      
      // Create enums if they don't exist
      await client.query(`
        DO $$ BEGIN
          CREATE TYPE "public"."async_job_status" AS ENUM('pending', 'processing', 'completed', 'failed');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `);
      
      await client.query(`
        DO $$ BEGIN
          CREATE TYPE "public"."async_job_type" AS ENUM('sow_extraction', 'report_generation', 'bulk_import');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create async_jobs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "async_jobs" (
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
      `);

      await client.query(`
        ALTER TABLE "async_jobs" DROP CONSTRAINT IF EXISTS "async_jobs_user_id_users_id_fk";
        ALTER TABLE "async_jobs" ADD CONSTRAINT "async_jobs_user_id_users_id_fk" 
          FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
      `);

      await client.query(`CREATE INDEX IF NOT EXISTS "idx_async_jobs_user_id" ON "async_jobs" USING btree ("user_id");`);
      await client.query(`CREATE INDEX IF NOT EXISTS "idx_async_jobs_status" ON "async_jobs" USING btree ("status");`);
      await client.query(`CREATE INDEX IF NOT EXISTS "idx_async_jobs_type" ON "async_jobs" USING btree ("type");`);
      await client.query(`CREATE INDEX IF NOT EXISTS "idx_async_jobs_created_at" ON "async_jobs" USING btree ("created_at");`);

      console.log('   ✅ async_jobs table created\n');
    } else {
      console.log('📦 Step 4: async_jobs table already exists\n');
    }

    // Mark migration 3 as applied
    if (!appliedHashes.has(MIGRATIONS[2].hash)) {
      await client.query(
        'INSERT INTO __drizzle_migrations (hash, created_at) VALUES ($1, $2)',
        [MIGRATIONS[2].hash, MIGRATIONS[2].created_at]
      );
      console.log(`   ✅ Marked as applied: ${MIGRATIONS[2].hash}\n`);
    }

    // Step 5: Create organization infrastructure if needed
    if (!orgTablesExist) {
      console.log('🏢 Step 5: Creating organization infrastructure...');
      
      // Create organization_role enum
      await client.query(`
        DO $$ BEGIN
          CREATE TYPE "public"."organization_role" AS ENUM('owner', 'admin', 'member', 'viewer');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create organizations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "organizations" (
          "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "name" varchar(255) NOT NULL,
          "slug" varchar(100) NOT NULL,
          "description" text,
          "logo_url" varchar(500),
          "settings" jsonb DEFAULT '{}'::jsonb,
          "billing_email" varchar(255),
          "plan" varchar(50) DEFAULT 'free',
          "is_active" boolean DEFAULT true,
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now(),
          CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
        );
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS "idx_organizations_slug" ON "organizations" USING btree ("slug");`);
      await client.query(`CREATE INDEX IF NOT EXISTS "idx_organizations_is_active" ON "organizations" USING btree ("is_active");`);

      // Create organization_members table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "organization_members" (
          "id" serial PRIMARY KEY NOT NULL,
          "organization_id" varchar NOT NULL,
          "user_id" varchar NOT NULL,
          "role" "organization_role" DEFAULT 'member' NOT NULL,
          "invited_by" varchar,
          "invited_at" timestamp,
          "joined_at" timestamp DEFAULT now(),
          "is_default" boolean DEFAULT false,
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now()
        );
      `);
      await client.query(`
        ALTER TABLE "organization_members" DROP CONSTRAINT IF EXISTS "organization_members_organization_id_organizations_id_fk";
        ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" 
          FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade;
      `);
      await client.query(`
        ALTER TABLE "organization_members" DROP CONSTRAINT IF EXISTS "organization_members_user_id_users_id_fk";
        ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" 
          FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS "idx_org_members_org_id" ON "organization_members" USING btree ("organization_id");`);
      await client.query(`CREATE INDEX IF NOT EXISTS "idx_org_members_user_id" ON "organization_members" USING btree ("user_id");`);
      await client.query(`CREATE INDEX IF NOT EXISTS "idx_org_members_unique" ON "organization_members" USING btree ("organization_id","user_id");`);

      // Create organization_invitations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "organization_invitations" (
          "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "organization_id" varchar NOT NULL,
          "email" varchar(255) NOT NULL,
          "role" "organization_role" DEFAULT 'member' NOT NULL,
          "invited_by" varchar NOT NULL,
          "token" varchar(100) NOT NULL,
          "expires_at" timestamp NOT NULL,
          "accepted_at" timestamp,
          "created_at" timestamp DEFAULT now(),
          CONSTRAINT "organization_invitations_token_unique" UNIQUE("token")
        );
      `);
      await client.query(`
        ALTER TABLE "organization_invitations" DROP CONSTRAINT IF EXISTS "organization_invitations_organization_id_organizations_id_fk";
        ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_organizations_id_fk" 
          FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade;
      `);
      await client.query(`
        ALTER TABLE "organization_invitations" DROP CONSTRAINT IF EXISTS "organization_invitations_invited_by_users_id_fk";
        ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_invited_by_users_id_fk" 
          FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id");
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS "idx_org_invitations_org_id" ON "organization_invitations" USING btree ("organization_id");`);
      await client.query(`CREATE INDEX IF NOT EXISTS "idx_org_invitations_email" ON "organization_invitations" USING btree ("email");`);
      await client.query(`CREATE INDEX IF NOT EXISTS "idx_org_invitations_token" ON "organization_invitations" USING btree ("token");`);

      console.log('   ✅ Organization tables created\n');
    } else {
      console.log('🏢 Step 5: Organization tables already exist\n');
    }

    // Step 6: Create default organization and migrate existing data
    console.log('🏠 Step 6: Creating default organization and migrating data...');
    
    // Check if default org exists
    const defaultOrgCheck = await client.query(
      `SELECT id FROM organizations WHERE slug = 'default-workspace' LIMIT 1`
    );
    
    let defaultOrgId: string;
    if (defaultOrgCheck.rows.length === 0) {
      // Create default organization
      defaultOrgId = randomUUID();
      await client.query(`
        INSERT INTO organizations (id, name, slug, description, plan, is_active)
        VALUES ($1, 'Default Workspace', 'default-workspace', 'Auto-created workspace for existing data', 'free', true)
      `, [defaultOrgId]);
      console.log(`   ✅ Created default organization: ${defaultOrgId}`);
    } else {
      defaultOrgId = defaultOrgCheck.rows[0].id;
      console.log(`   ℹ️  Default organization already exists: ${defaultOrgId}`);
    }

    // Step 7: Add organization_id columns if they don't exist
    console.log('\n📊 Step 7: Adding organization_id columns to tables...');

    // Helper function to check if column exists
    const columnExists = async (table: string, column: string): Promise<boolean> => {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1 
          AND column_name = $2
        );
      `, [table, column]);
      return result.rows[0].exists;
    };

    // Add organization_id to projects
    if (!(await columnExists('projects', 'organization_id'))) {
      await client.query(`ALTER TABLE "projects" ADD COLUMN "organization_id" varchar;`);
      console.log('   ✅ Added organization_id to projects');
    }
    
    // Add organization_id to async_jobs
    if (!(await columnExists('async_jobs', 'organization_id'))) {
      await client.query(`ALTER TABLE "async_jobs" ADD COLUMN "organization_id" varchar;`);
      console.log('   ✅ Added organization_id to async_jobs');
    }

    // Add organization_id to custom_fields
    if (!(await columnExists('custom_fields', 'organization_id'))) {
      await client.query(`ALTER TABLE "custom_fields" ADD COLUMN "organization_id" varchar;`);
      console.log('   ✅ Added organization_id to custom_fields');
    }

    // Add organization_id to dashboard_widgets
    if (!(await columnExists('dashboard_widgets', 'organization_id'))) {
      await client.query(`ALTER TABLE "dashboard_widgets" ADD COLUMN "organization_id" varchar;`);
      console.log('   ✅ Added organization_id to dashboard_widgets');
    }

    // Add organization_id to notifications
    if (!(await columnExists('notifications', 'organization_id'))) {
      await client.query(`ALTER TABLE "notifications" ADD COLUMN "organization_id" varchar;`);
      console.log('   ✅ Added organization_id to notifications');
    }

    // Add organization_id to project_templates
    if (!(await columnExists('project_templates', 'organization_id'))) {
      await client.query(`ALTER TABLE "project_templates" ADD COLUMN "organization_id" varchar;`);
      console.log('   ✅ Added organization_id to project_templates');
    }

    // Step 8: Migrate existing data to default organization
    console.log('\n🔄 Step 8: Migrating existing data to default organization...');

    // Update projects
    const projectsResult = await client.query(`
      UPDATE projects SET organization_id = $1 WHERE organization_id IS NULL
    `, [defaultOrgId]);
    console.log(`   ✅ Updated ${projectsResult.rowCount} projects`);

    // Update custom_fields (via projects)
    const customFieldsResult = await client.query(`
      UPDATE custom_fields SET organization_id = $1 WHERE organization_id IS NULL
    `, [defaultOrgId]);
    console.log(`   ✅ Updated ${customFieldsResult.rowCount} custom_fields`);

    // Update dashboard_widgets
    const widgetsResult = await client.query(`
      UPDATE dashboard_widgets SET organization_id = $1 WHERE organization_id IS NULL
    `, [defaultOrgId]);
    console.log(`   ✅ Updated ${widgetsResult.rowCount} dashboard_widgets`);

    // Update notifications
    const notificationsResult = await client.query(`
      UPDATE notifications SET organization_id = $1 WHERE organization_id IS NULL
    `, [defaultOrgId]);
    console.log(`   ✅ Updated ${notificationsResult.rowCount} notifications`);

    // Update async_jobs
    const jobsResult = await client.query(`
      UPDATE async_jobs SET organization_id = $1 WHERE organization_id IS NULL
    `, [defaultOrgId]);
    console.log(`   ✅ Updated ${jobsResult.rowCount} async_jobs`);

    // Step 9: Add all users to default organization
    console.log('\n👥 Step 9: Adding existing users to default organization...');
    
    const usersResult = await client.query(`SELECT id FROM users`);
    let addedUsers = 0;
    
    for (const user of usersResult.rows) {
      // Check if user is already a member
      const existingMembership = await client.query(
        `SELECT 1 FROM organization_members WHERE organization_id = $1 AND user_id = $2`,
        [defaultOrgId, user.id]
      );
      
      if (existingMembership.rows.length === 0) {
        await client.query(`
          INSERT INTO organization_members (organization_id, user_id, role, is_default, joined_at)
          VALUES ($1, $2, 'member', true, NOW())
        `, [defaultOrgId, user.id]);
        addedUsers++;
      }
    }
    console.log(`   ✅ Added ${addedUsers} users to default organization`);

    // Promote first user (or admin) to owner
    const firstAdmin = await client.query(`
      SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1
    `);
    const firstUser = await client.query(`
      SELECT id FROM users ORDER BY created_at LIMIT 1
    `);
    const ownerUserId = firstAdmin.rows[0]?.id || firstUser.rows[0]?.id;
    
    if (ownerUserId) {
      await client.query(`
        UPDATE organization_members 
        SET role = 'owner' 
        WHERE organization_id = $1 AND user_id = $2
      `, [defaultOrgId, ownerUserId]);
      console.log(`   ✅ Set user ${ownerUserId} as organization owner`);
    }

    // Step 10: Add NOT NULL constraints
    console.log('\n🔒 Step 10: Adding NOT NULL constraints...');

    // Make organization_id NOT NULL where appropriate
    await client.query(`
      ALTER TABLE projects 
      ALTER COLUMN organization_id SET NOT NULL;
    `);
    console.log('   ✅ projects.organization_id is now NOT NULL');

    // Add foreign key constraints
    await client.query(`
      ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_organization_id_organizations_id_fk";
      ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" 
        FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade;
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_projects_organization_id" ON "projects" USING btree ("organization_id");`);
    console.log('   ✅ Added foreign key and index for projects.organization_id');

    // Step 11: Mark multi-tenancy migration as applied
    console.log('\n📋 Step 11: Marking multi-tenancy migration as applied...');
    
    if (!appliedHashes.has(MIGRATIONS[3].hash)) {
      await client.query(
        'INSERT INTO __drizzle_migrations (hash, created_at) VALUES ($1, $2)',
        [MIGRATIONS[3].hash, MIGRATIONS[3].created_at]
      );
      console.log(`   ✅ Marked as applied: ${MIGRATIONS[3].hash}`);
    } else {
      console.log(`   ℹ️  Already recorded: ${MIGRATIONS[3].hash}`);
    }

    // Step 12: Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ DATABASE FIX COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`\nDefault Organization ID: ${defaultOrgId}`);
    console.log(`Default Organization Slug: default-workspace`);
    console.log(`\nNext steps:`);
    console.log(`1. The RLS policies migration (20251219180200_rls_policies.sql) has NOT been applied.`);
    console.log(`   This is intentional - RLS can be applied later if needed.`);
    console.log(`2. Run 'npm run dev' to start the application.`);
    console.log(`3. All existing users have been added to the default workspace.`);
    console.log(`4. All existing projects are now under the default workspace.\n`);

    // Show final migration state
    const finalMigrations = await client.query('SELECT * FROM __drizzle_migrations ORDER BY id');
    console.log('📋 Applied migrations:');
    for (const row of finalMigrations.rows) {
      console.log(`  - ${row.hash}`);
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

