/**
 * Automation rules database operations.
 * Handles workflow automation configuration.
 */

import { automationRules, type AutomationRule, type InsertAutomationRule } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import type { IAutomationStorage } from "./types";

export class AutomationStorage implements IAutomationStorage {
  async getAutomationRules(projectId: number): Promise<AutomationRule[]> {
    return await db.select().from(automationRules).where(eq(automationRules.projectId, projectId));
  }

  async createAutomationRule(ruleData: InsertAutomationRule): Promise<AutomationRule> {
    const [rule] = await db.insert(automationRules).values(ruleData).returning();
    return rule;
  }
}

