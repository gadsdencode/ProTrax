/**
 * Budget and financial database operations.
 * Handles budget items, time entries, and expenses.
 */

import {
  budgetItems,
  timeEntries,
  expenses,
  type BudgetItem,
  type InsertBudgetItem,
  type TimeEntry,
  type InsertTimeEntry,
  type Expense,
  type InsertExpense,
} from "@shared/schema";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import type { IBudgetStorage } from "./types";

export class BudgetStorage implements IBudgetStorage {
  // ============= BUDGET ITEMS =============

  async getBudgetItems(projectId: number): Promise<BudgetItem[]> {
    return await db.select().from(budgetItems).where(eq(budgetItems.projectId, projectId));
  }

  async createBudgetItem(itemData: InsertBudgetItem): Promise<BudgetItem> {
    const [item] = await db.insert(budgetItems).values(itemData).returning();
    return item;
  }

  // ============= TIME ENTRIES =============

  async getTimeEntries(taskId: number): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries).where(eq(timeEntries.taskId, taskId)).orderBy(desc(timeEntries.date));
  }

  async createTimeEntry(entryData: InsertTimeEntry): Promise<TimeEntry> {
    const [entry] = await db.insert(timeEntries).values(entryData).returning();
    return entry;
  }

  // ============= EXPENSES =============

  async getExpenses(projectId: number): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.projectId, projectId)).orderBy(desc(expenses.date));
  }

  async createExpense(expenseData: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(expenseData).returning();
    return expense;
  }
}

