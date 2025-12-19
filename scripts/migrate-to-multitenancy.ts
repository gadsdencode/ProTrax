/**
 * Multi-Tenancy Data Migration Script
 * 
 * This script migrates existing data to the multi-tenant model by:
 * 1. Creating a default organization for existing data
 * 2. Adding all existing users as members of this organization
 * 3. Updating all existing projects to belong to this organization
 * 4. Updating all related tables with the organization_id
 * 
 * Run this script AFTER applying the schema migrations:
 *   npx tsx scripts/migrate-to-multitenancy.ts
 * 
 * Environment Variables Required:
 *   - DATABASE_URL: PostgreSQL connection string
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { sql } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

const DEFAULT_ORG_NAME = 'Default Organization';
const DEFAULT_ORG_SLUG = 'default';

async function migrateToMultiTenancy() {
  console.log('🚀 Starting Multi-Tenancy Migration...\n');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });

  try {
    // Step 1: Check if migration is needed
    console.log('📋 Checking migration status...');
    
    const [existingOrg] = await db.execute<{ id: string }>(
      sql`SELECT id FROM organizations WHERE slug = ${DEFAULT_ORG_SLUG} LIMIT 1`
    );
    
    let organizationId: string;
    
    if (existingOrg) {
      console.log('  ✓ Default organization already exists:', existingOrg.id);
      organizationId = existingOrg.id;
    } else {
      // Step 2: Create default organization
      console.log('\n📦 Creating default organization...');
      
      const [newOrg] = await db.execute<{ id: string }>(sql`
        INSERT INTO organizations (name, slug, description, is_active)
        VALUES (
          ${DEFAULT_ORG_NAME},
          ${DEFAULT_ORG_SLUG},
          'Default organization for migrated data',
          true
        )
        RETURNING id
      `);
      
      organizationId = newOrg.id;
      console.log('  ✓ Created default organization:', organizationId);
    }

    // Step 3: Add all users to the organization
    console.log('\n👥 Migrating users to organization...');
    
    const userResult = await db.execute(sql`
      INSERT INTO organization_members (organization_id, user_id, role, is_default, joined_at)
      SELECT 
        ${organizationId},
        id,
        CASE WHEN role = 'admin' THEN 'owner'::organization_role
             ELSE 'member'::organization_role
        END,
        true,
        NOW()
      FROM users
      WHERE id NOT IN (
        SELECT user_id FROM organization_members WHERE organization_id = ${organizationId}
      )
      ON CONFLICT DO NOTHING
    `);
    
    console.log('  ✓ Users migrated:', userResult.rowCount || 0);

    // Step 4: Update projects with organization_id
    console.log('\n📁 Updating projects with organization_id...');
    
    const projectResult = await db.execute(sql`
      UPDATE projects 
      SET organization_id = ${organizationId}
      WHERE organization_id IS NULL OR organization_id = ''
    `);
    
    console.log('  ✓ Projects updated:', projectResult.rowCount || 0);

    // Step 5: Update custom_fields with organization_id
    console.log('\n🔧 Updating custom_fields with organization_id...');
    
    const customFieldsResult = await db.execute(sql`
      UPDATE custom_fields 
      SET organization_id = ${organizationId}
      WHERE organization_id IS NULL OR organization_id = ''
    `);
    
    console.log('  ✓ Custom fields updated:', customFieldsResult.rowCount || 0);

    // Step 6: Update dashboard_widgets with organization_id
    console.log('\n📊 Updating dashboard_widgets with organization_id...');
    
    const widgetsResult = await db.execute(sql`
      UPDATE dashboard_widgets 
      SET organization_id = ${organizationId}
      WHERE organization_id IS NULL OR organization_id = ''
    `);
    
    console.log('  ✓ Dashboard widgets updated:', widgetsResult.rowCount || 0);

    // Step 7: Update notifications with organization_id
    console.log('\n🔔 Updating notifications with organization_id...');
    
    const notificationsResult = await db.execute(sql`
      UPDATE notifications 
      SET organization_id = ${organizationId}
      WHERE organization_id IS NULL OR organization_id = ''
    `);
    
    console.log('  ✓ Notifications updated:', notificationsResult.rowCount || 0);

    // Step 8: Update async_jobs with organization_id
    console.log('\n⚙️ Updating async_jobs with organization_id...');
    
    const asyncJobsResult = await db.execute(sql`
      UPDATE async_jobs 
      SET organization_id = ${organizationId}
      WHERE organization_id IS NULL OR organization_id = ''
    `);
    
    console.log('  ✓ Async jobs updated:', asyncJobsResult.rowCount || 0);

    // Step 9: Update project_templates with organization_id (optional - can be null for public)
    console.log('\n📋 Updating project_templates with organization_id...');
    
    const templatesResult = await db.execute(sql`
      UPDATE project_templates 
      SET organization_id = ${organizationId}
      WHERE organization_id IS NULL AND is_public = false
    `);
    
    console.log('  ✓ Project templates updated:', templatesResult.rowCount || 0);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ Multi-Tenancy Migration Complete!');
    console.log('='.repeat(50));
    console.log(`\nDefault Organization ID: ${organizationId}`);
    console.log('\nNext Steps:');
    console.log('1. Verify the migration by checking data in Drizzle Studio');
    console.log('2. Apply the RLS policies migration: migrations/20251219180200_rls_policies.sql');
    console.log('3. Test the application with organization context');
    console.log('');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
migrateToMultiTenancy().catch(console.error);

