/**
 * Kanban board database operations.
 * Handles kanban column configuration.
 * 
 * Supports Dependency Injection: Pass a custom database instance
 * via constructor for testing or multi-tenancy scenarios.
 */

import { kanbanColumns, type KanbanColumn, type InsertKanbanColumn } from "@shared/schema";
import { db as defaultDb } from "../db";
import { eq, asc } from "drizzle-orm";
import type { IKanbanStorage, DatabaseInstance } from "./types";

export class KanbanStorage implements IKanbanStorage {
  private readonly db: DatabaseInstance;

  /**
   * Creates a KanbanStorage instance.
   * @param dbInstance - Optional database instance for dependency injection.
   *                     Defaults to the shared db instance if not provided.
   */
  constructor(dbInstance?: DatabaseInstance) {
    this.db = dbInstance ?? defaultDb;
  }

  async getKanbanColumns(projectId: number): Promise<KanbanColumn[]> {
    return await this.db.select().from(kanbanColumns).where(eq(kanbanColumns.projectId, projectId)).orderBy(asc(kanbanColumns.position));
  }

  async createKanbanColumn(columnData: InsertKanbanColumn): Promise<KanbanColumn> {
    const [column] = await this.db.insert(kanbanColumns).values(columnData).returning();
    return column;
  }
}
