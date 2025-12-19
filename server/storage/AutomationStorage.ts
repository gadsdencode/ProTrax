/**
 * Automation rules database operations.
 * Handles workflow automation configuration.
 * 
 * Supports Dependency Injection: Pass a custom database instance
 * via constructor for testing or multi-tenancy scenarios.
 */

import { automationRules, type AutomationRule, type InsertAutomationRule } from "@shared/schema";
import { db as defaultDb } from "../db";
import { eq } from "drizzle-orm";
import type { IAutomationStorage, DatabaseInstance } from "./types";

export class AutomationStorage implements IAutomationStorage {
  private readonly db: DatabaseInstance;

  /**
   * Creates an AutomationStorage instance.
   * @param dbInstance - Optional database instance for dependency injection.
   *                     Defaults to the shared db instance if not provided.
   */
  constructor(dbInstance?: DatabaseInstance) {
    this.db = dbInstance ?? defaultDb;
  }

  async getAutomationRules(projectId: number): Promise<AutomationRule[]> {
    return await this.db.select().from(automationRules).where(eq(automationRules.projectId, projectId));
  }

  async createAutomationRule(ruleData: InsertAutomationRule): Promise<AutomationRule> {
    const [rule] = await this.db.insert(automationRules).values(ruleData).returning();
    return rule;
  }
}
