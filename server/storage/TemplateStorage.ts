/**
 * Project template database operations.
 * Handles template CRUD and management.
 */

import { projectTemplates, type ProjectTemplate, type InsertProjectTemplate } from "@shared/schema";
import { db } from "../db";
import { desc } from "drizzle-orm";
import type { ITemplateStorage } from "./types";

export class TemplateStorage implements ITemplateStorage {
  async getProjectTemplates(): Promise<ProjectTemplate[]> {
    return await db.select().from(projectTemplates).orderBy(desc(projectTemplates.createdAt));
  }

  async createProjectTemplate(templateData: InsertProjectTemplate): Promise<ProjectTemplate> {
    const [template] = await db.insert(projectTemplates).values(templateData).returning();
    return template;
  }
}

