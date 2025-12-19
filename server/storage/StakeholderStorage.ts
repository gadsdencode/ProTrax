/**
 * Project stakeholder database operations.
 * Handles stakeholder management and permissions.
 */

import { projectStakeholders, type ProjectStakeholder, type InsertProjectStakeholder } from "@shared/schema";
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import type { IStakeholderStorage } from "./types";

export class StakeholderStorage implements IStakeholderStorage {
  async getProjectStakeholders(projectId: number): Promise<ProjectStakeholder[]> {
    return await db.select().from(projectStakeholders).where(eq(projectStakeholders.projectId, projectId));
  }

  async addProjectStakeholder(stakeholderData: InsertProjectStakeholder): Promise<ProjectStakeholder> {
    const [stakeholder] = await db.insert(projectStakeholders).values(stakeholderData).returning();
    return stakeholder;
  }

  async removeProjectStakeholder(projectId: number, userId: string): Promise<void> {
    await db.delete(projectStakeholders).where(
      and(
        eq(projectStakeholders.projectId, projectId),
        eq(projectStakeholders.userId, userId)
      )
    );
  }

  async updateProjectStakeholder(id: number, updates: Partial<InsertProjectStakeholder>): Promise<ProjectStakeholder> {
    const [stakeholder] = await db
      .update(projectStakeholders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectStakeholders.id, id))
      .returning();
    return stakeholder;
  }
}

