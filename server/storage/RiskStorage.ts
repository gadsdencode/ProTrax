/**
 * Risk management database operations.
 * Handles project risk CRUD and tracking.
 * 
 * Supports Dependency Injection: Pass a custom database instance
 * via constructor for testing or multi-tenancy scenarios.
 */

import { risks, type Risk, type InsertRisk } from "@shared/schema";
import { db as defaultDb } from "../db";
import { eq, desc } from "drizzle-orm";
import type { IRiskStorage, DatabaseInstance } from "./types";

export class RiskStorage implements IRiskStorage {
  private readonly db: DatabaseInstance;

  /**
   * Creates a RiskStorage instance.
   * @param dbInstance - Optional database instance for dependency injection.
   *                     Defaults to the shared db instance if not provided.
   */
  constructor(dbInstance?: DatabaseInstance) {
    this.db = dbInstance ?? defaultDb;
  }

  async getRisks(projectId: number): Promise<Risk[]> {
    return await this.db.select().from(risks).where(eq(risks.projectId, projectId)).orderBy(desc(risks.riskScore));
  }

  async createRisk(riskData: InsertRisk): Promise<Risk> {
    const [risk] = await this.db.insert(risks).values(riskData).returning();
    return risk;
  }

  async updateRisk(id: number, riskData: Partial<InsertRisk>): Promise<Risk> {
    const [risk] = await this.db
      .update(risks)
      .set({ ...riskData, updatedAt: new Date() })
      .where(eq(risks.id, id))
      .returning();
    return risk;
  }
}
