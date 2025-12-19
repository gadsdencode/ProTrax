/**
 * Script to mark existing migrations as applied.
 * Used when switching from db:push to migrations on an existing database.
 */

import 'dotenv/config';
import { pool } from '../server/db.ts';

async function markMigrationApplied() {
  const client = await pool.connect();
  
  try {
    // Create the migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at BIGINT
      );
    `);
    
    // The migration hash from our journal file
    const migrationHash = '20251219110154_keen_gravity';
    const createdAt = 1766142114590;
    
    // Check if migration is already marked as applied
    const existing = await client.query(
      `SELECT * FROM __drizzle_migrations WHERE hash = $1`,
      [migrationHash]
    );
    
    if (existing.rows.length === 0) {
      // Mark the migration as applied
      await client.query(
        `INSERT INTO __drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
        [migrationHash, createdAt]
      );
      console.log('✅ Migration marked as applied:', migrationHash);
    } else {
      console.log('ℹ️ Migration already marked as applied:', migrationHash);
    }
    
    // Show current migration state
    const allMigrations = await client.query('SELECT * FROM __drizzle_migrations ORDER BY id');
    console.log('\n📋 Applied migrations:');
    for (const row of allMigrations.rows) {
      console.log(`  - ${row.hash} (applied at: ${new Date(Number(row.created_at)).toISOString()})`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

markMigrationApplied();

