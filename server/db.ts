import { Pool, neonConfig, PoolClient } from '@neondatabase/serverless';
import { drizzle, NeonDatabase } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "./db/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

/** Type alias for a Drizzle database instance with our schema */
export type DrizzleDB = NeonDatabase<typeof schema>;

/**
 * Execute a database operation with RLS context set.
 * 
 * CRITICAL: This function properly handles connection pooling with RLS by:
 * 1. Acquiring a dedicated client from the pool
 * 2. Starting a transaction (required for SET LOCAL to work)
 * 3. Setting the RLS context within the transaction
 * 4. Executing the operation with a Drizzle instance bound to that client
 * 5. Committing or rolling back the transaction
 * 6. RESETTING the RLS context before returning connection to pool (prevents poisoning)
 * 7. Releasing the client back to the pool
 * 
 * @param organizationId - The organization ID to set in RLS context
 * @param operation - The async operation to execute. Receives a Drizzle DB instance
 *                    that is bound to the client with RLS context set.
 * @returns The result of the operation
 * 
 * @example
 * ```typescript
 * const projects = await withRLSContext(req.organizationId!, async (txDb) => {
 *   return txDb.select().from(projects);
 * });
 * ```
 */
export async function withRLSContext<T>(
  organizationId: string,
  operation: (db: DrizzleDB) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    // Start a transaction - SET LOCAL only works within a transaction
    await client.query('BEGIN');
    
    // Set the RLS context for this transaction
    await client.query('SET LOCAL rls.org_id = $1', [organizationId]);
    
    // Create a Drizzle instance bound to this specific client
    // This ensures all queries in the operation use the same connection with RLS context
    const txDb = drizzle({ client, schema });
    
    // Execute the operation with the transaction-bound Drizzle instance
    const result = await operation(txDb);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    return result;
  } catch (error) {
    // Rollback on any error
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // CRITICAL: Reset the RLS context before returning the connection to the pool
    // This prevents "connection poisoning" where the next user of this connection
    // could inadvertently have the wrong tenant context set
    try {
      await client.query('RESET rls.org_id');
    } catch (resetError) {
      // Log but don't throw - we still need to release the connection
      console.error('[RLS] Failed to reset context before release:', resetError);
    }
    
    // Release the client back to the pool
    client.release();
  }
}

/**
 * Execute a database operation with RLS context, with explicit read-only mode.
 * Use this for SELECT queries where you want to ensure no modifications occur.
 * 
 * @param organizationId - The organization ID to set in RLS context
 * @param operation - The async read-only operation to execute
 * @returns The result of the operation
 */
export async function withRLSContextReadOnly<T>(
  organizationId: string,
  operation: (db: DrizzleDB) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    // Start a read-only transaction
    await client.query('BEGIN READ ONLY');
    
    // Set the RLS context for this transaction
    await client.query('SET LOCAL rls.org_id = $1', [organizationId]);
    
    // Create a Drizzle instance bound to this specific client
    const txDb = drizzle({ client, schema });
    
    // Execute the operation
    const result = await operation(txDb);
    
    // Commit (end) the read-only transaction
    await client.query('COMMIT');
    
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // CRITICAL: Reset the RLS context before returning to pool
    try {
      await client.query('RESET rls.org_id');
    } catch (resetError) {
      console.error('[RLS] Failed to reset context before release:', resetError);
    }
    client.release();
  }
}

/**
 * Set RLS context on a specific connection.
 * Used when you need manual control over the connection lifecycle.
 * 
 * WARNING: You MUST call clearRLSContext() before releasing the client,
 * or use withRLSContext() which handles this automatically.
 * 
 * @param client - The database client/connection
 * @param organizationId - The organization ID to set
 */
export async function setRLSContextOnClient(
  client: PoolClient,
  organizationId: string
): Promise<void> {
  await client.query('SET LOCAL rls.org_id = $1', [organizationId]);
}

/**
 * Clear/Reset RLS context on a connection.
 * 
 * CRITICAL: Call this before releasing a connection back to the pool
 * if you used setRLSContextOnClient() manually.
 * 
 * @param client - The database client/connection
 */
export async function clearRLSContext(client: PoolClient): Promise<void> {
  await client.query('RESET rls.org_id');
}

/**
 * Get the current RLS organization ID from a client connection.
 * Useful for debugging and validation.
 * 
 * @param client - The database client/connection
 * @returns The current organization ID or null if not set
 */
export async function getCurrentRLSContext(client: PoolClient): Promise<string | null> {
  const result = await client.query("SELECT NULLIF(current_setting('rls.org_id', TRUE), '') as org_id");
  return result.rows[0]?.org_id || null;
}
