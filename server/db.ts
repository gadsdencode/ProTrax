import { Pool, neonConfig, PoolClient } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
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

/**
 * Execute a database operation with RLS context set.
 * This ensures the organization context is properly set before running queries.
 * 
 * @param organizationId - The organization ID to set in RLS context
 * @param operation - The async operation to execute with RLS context
 * @returns The result of the operation
 * 
 * @example
 * ```typescript
 * const projects = await withRLSContext(req.organizationId!, async () => {
 *   return db.select().from(projects);
 * });
 * ```
 */
export async function withRLSContext<T>(
  organizationId: string,
  operation: () => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    // Set the RLS context for this session
    await client.query(`SET LOCAL rls.org_id = $1`, [organizationId]);
    
    // Execute the operation
    return await operation();
  } finally {
    client.release();
  }
}

/**
 * Set RLS context on a specific connection.
 * Used by middleware to set context for the duration of a request.
 * 
 * @param client - The database client/connection
 * @param organizationId - The organization ID to set
 */
export async function setRLSContextOnClient(
  client: PoolClient,
  organizationId: string
): Promise<void> {
  await client.query(`SET LOCAL rls.org_id = $1`, [organizationId]);
}

/**
 * Clear RLS context on a connection.
 * 
 * @param client - The database client/connection
 */
export async function clearRLSContext(client: PoolClient): Promise<void> {
  await client.query(`RESET rls.org_id`);
}
