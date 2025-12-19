/**
 * Dashboard widget database operations.
 * Handles user dashboard configuration and widgets.
 */

import { dashboardWidgets, type DashboardWidget, type InsertDashboardWidget } from "@shared/schema";
import { db } from "../db";
import { eq, asc } from "drizzle-orm";
import type { IDashboardStorage } from "./types";

export class DashboardStorage implements IDashboardStorage {
  async getDashboardWidgets(userId: string): Promise<DashboardWidget[]> {
    return await db.select().from(dashboardWidgets).where(eq(dashboardWidgets.userId, userId)).orderBy(asc(dashboardWidgets.position));
  }

  async createDashboardWidget(widgetData: InsertDashboardWidget): Promise<DashboardWidget> {
    const [widget] = await db.insert(dashboardWidgets).values(widgetData).returning();
    return widget;
  }
}

