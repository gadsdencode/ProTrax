/**
 * Sprint-related database operations.
 * Handles sprint CRUD and lifecycle management.
 */

import { sprints, type Sprint, type InsertSprint } from "@shared/schema";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import type { ISprintStorage } from "./types";

export class SprintStorage implements ISprintStorage {
  async getSprints(projectId: number): Promise<Sprint[]> {
    return await db.select().from(sprints).where(eq(sprints.projectId, projectId)).orderBy(desc(sprints.startDate));
  }

  async getSprint(id: number): Promise<Sprint | undefined> {
    const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id));
    return sprint;
  }

  async createSprint(sprintData: InsertSprint): Promise<Sprint> {
    const [sprint] = await db.insert(sprints).values(sprintData).returning();
    return sprint;
  }

  async updateSprint(id: number, sprintData: Partial<InsertSprint>): Promise<Sprint> {
    const [sprint] = await db
      .update(sprints)
      .set({ ...sprintData, updatedAt: new Date() })
      .where(eq(sprints.id, id))
      .returning();
    return sprint;
  }

  async deleteSprint(id: number): Promise<void> {
    await db.delete(sprints).where(eq(sprints.id, id));
  }
}

