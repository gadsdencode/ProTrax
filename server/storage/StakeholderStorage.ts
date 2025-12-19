/**
 * Project stakeholder database operations.
 * Handles stakeholder management and permissions.
 * 
 * Supports Dependency Injection: Pass a custom database instance
 * via constructor for testing or multi-tenancy scenarios.
 */

import { projectStakeholders, type ProjectStakeholder, type InsertProjectStakeholder } from "@shared/schema";
import { db as defaultDb } from "../db";
import { eq, and } from "drizzle-orm";
import type { IStakeholderStorage, DatabaseInstance } from "./types";

export class StakeholderStorage implements IStakeholderStorage {
  private readonly db: DatabaseInstance;

  /**
   * Creates a StakeholderStorage instance.
   * @param dbInstance - Optional database instance for dependency injection.
   *                     Defaults to the shared db instance if not provided.
   */
  constructor(dbInstance?: DatabaseInstance) {
    this.db = dbInstance ?? defaultDb;
  }

  async getProjectStakeholders(projectId: number): Promise<ProjectStakeholder[]> {
    return await this.db.select().from(projectStakeholders).where(eq(projectStakeholders.projectId, projectId));
  }

  async addProjectStakeholder(stakeholderData: InsertProjectStakeholder): Promise<ProjectStakeholder> {
    const [stakeholder] = await this.db.insert(projectStakeholders).values(stakeholderData).returning();
    return stakeholder;
  }

  async removeProjectStakeholder(projectId: number, userId: string): Promise<void> {
    await this.db.delete(projectStakeholders).where(
      and(
        eq(projectStakeholders.projectId, projectId),
        eq(projectStakeholders.userId, userId)
      )
    );
  }

  async updateProjectStakeholder(id: number, updates: Partial<InsertProjectStakeholder>): Promise<ProjectStakeholder> {
    const [stakeholder] = await this.db
      .update(projectStakeholders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectStakeholders.id, id))
      .returning();
    return stakeholder;
  }
}
