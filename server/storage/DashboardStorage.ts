/**
 * Dashboard widget database operations.
 * Handles user dashboard configuration and widgets.
 * 
 * Supports Dependency Injection: Pass a custom database instance
 * via constructor for testing or multi-tenancy scenarios.
 */

import { dashboardWidgets, type DashboardWidget, type InsertDashboardWidget } from "@shared/schema";
import { db as defaultDb } from "../db";
import { eq, asc } from "drizzle-orm";
import type { IDashboardStorage, DatabaseInstance } from "./types";

export class DashboardStorage implements IDashboardStorage {
  private readonly db: DatabaseInstance;

  /**
   * Creates a DashboardStorage instance.
   * @param dbInstance - Optional database instance for dependency injection.
   *                     Defaults to the shared db instance if not provided.
   */
  constructor(dbInstance?: DatabaseInstance) {
    this.db = dbInstance ?? defaultDb;
  }

  async getDashboardWidgets(userId: string): Promise<DashboardWidget[]> {
    return await this.db.select().from(dashboardWidgets).where(eq(dashboardWidgets.userId, userId)).orderBy(asc(dashboardWidgets.position));
  }

  async createDashboardWidget(widgetData: InsertDashboardWidget): Promise<DashboardWidget> {
    const [widget] = await this.db.insert(dashboardWidgets).values(widgetData).returning();
    return widget;
  }
}
