/**
 * Sprint-related database operations.
 * Handles sprint CRUD and lifecycle management.
 * 
 * Supports Dependency Injection: Pass a custom database instance
 * via constructor for testing or multi-tenancy scenarios.
 */

import { sprints, type Sprint, type InsertSprint } from "@shared/schema";
import { db as defaultDb } from "../db";
import { eq, desc } from "drizzle-orm";
import type { ISprintStorage, DatabaseInstance } from "./types";

export class SprintStorage implements ISprintStorage {
  private readonly db: DatabaseInstance;

  /**
   * Creates a SprintStorage instance.
   * @param dbInstance - Optional database instance for dependency injection.
   *                     Defaults to the shared db instance if not provided.
   */
  constructor(dbInstance?: DatabaseInstance) {
    this.db = dbInstance ?? defaultDb;
  }

  async getSprints(projectId: number): Promise<Sprint[]> {
    return await this.db.select().from(sprints).where(eq(sprints.projectId, projectId)).orderBy(desc(sprints.startDate));
  }

  async getSprint(id: number): Promise<Sprint | undefined> {
    const [sprint] = await this.db.select().from(sprints).where(eq(sprints.id, id));
    return sprint;
  }

  async createSprint(sprintData: InsertSprint): Promise<Sprint> {
    const [sprint] = await this.db.insert(sprints).values(sprintData).returning();
    return sprint;
  }

  async updateSprint(id: number, sprintData: Partial<InsertSprint>): Promise<Sprint> {
    const [sprint] = await this.db
      .update(sprints)
      .set({ ...sprintData, updatedAt: new Date() })
      .where(eq(sprints.id, id))
      .returning();
    return sprint;
  }

  async deleteSprint(id: number): Promise<void> {
    await this.db.delete(sprints).where(eq(sprints.id, id));
  }
}
