/**
 * Risk management database operations.
 * Handles project risk CRUD and tracking.
 */

import { risks, type Risk, type InsertRisk } from "@shared/schema";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import type { IRiskStorage } from "./types";

export class RiskStorage implements IRiskStorage {
  async getRisks(projectId: number): Promise<Risk[]> {
    return await db.select().from(risks).where(eq(risks.projectId, projectId)).orderBy(desc(risks.riskScore));
  }

  async createRisk(riskData: InsertRisk): Promise<Risk> {
    const [risk] = await db.insert(risks).values(riskData).returning();
    return risk;
  }

  async updateRisk(id: number, riskData: Partial<InsertRisk>): Promise<Risk> {
    const [risk] = await db
      .update(risks)
      .set({ ...riskData, updatedAt: new Date() })
      .where(eq(risks.id, id))
      .returning();
    return risk;
  }
}

