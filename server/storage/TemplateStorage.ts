/**
 * Project template database operations.
 * Handles template CRUD and management.
 * 
 * Supports Dependency Injection: Pass a custom database instance
 * via constructor for testing or multi-tenancy scenarios.
 */

import { projectTemplates, type ProjectTemplate, type InsertProjectTemplate } from "@shared/schema";
import { db as defaultDb } from "../db";
import { desc } from "drizzle-orm";
import type { ITemplateStorage, DatabaseInstance } from "./types";

export class TemplateStorage implements ITemplateStorage {
  private readonly db: DatabaseInstance;

  /**
   * Creates a TemplateStorage instance.
   * @param dbInstance - Optional database instance for dependency injection.
   *                     Defaults to the shared db instance if not provided.
   */
  constructor(dbInstance?: DatabaseInstance) {
    this.db = dbInstance ?? defaultDb;
  }

  async getProjectTemplates(): Promise<ProjectTemplate[]> {
    return await this.db.select().from(projectTemplates).orderBy(desc(projectTemplates.createdAt));
  }

  async createProjectTemplate(templateData: InsertProjectTemplate): Promise<ProjectTemplate> {
    const [template] = await this.db.insert(projectTemplates).values(templateData).returning();
    return template;
  }
}
