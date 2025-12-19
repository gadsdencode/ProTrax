/**
 * Kanban board database operations.
 * Handles kanban column configuration.
 */

import { kanbanColumns, type KanbanColumn, type InsertKanbanColumn } from "@shared/schema";
import { db } from "../db";
import { eq, asc } from "drizzle-orm";
import type { IKanbanStorage } from "./types";

export class KanbanStorage implements IKanbanStorage {
  async getKanbanColumns(projectId: number): Promise<KanbanColumn[]> {
    return await db.select().from(kanbanColumns).where(eq(kanbanColumns.projectId, projectId)).orderBy(asc(kanbanColumns.position));
  }

  async createKanbanColumn(columnData: InsertKanbanColumn): Promise<KanbanColumn> {
    const [column] = await db.insert(kanbanColumns).values(columnData).returning();
    return column;
  }
}

