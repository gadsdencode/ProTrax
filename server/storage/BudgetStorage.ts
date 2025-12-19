/**
 * Budget and financial database operations.
 * Handles budget items, time entries, and expenses.
 * 
 * Supports Dependency Injection: Pass a custom database instance
 * via constructor for testing or multi-tenancy scenarios.
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
import { db as defaultDb } from "../db";
import { eq, desc } from "drizzle-orm";
import type { IBudgetStorage, DatabaseInstance } from "./types";

export class BudgetStorage implements IBudgetStorage {
  private readonly db: DatabaseInstance;

  /**
   * Creates a BudgetStorage instance.
   * @param dbInstance - Optional database instance for dependency injection.
   *                     Defaults to the shared db instance if not provided.
   */
  constructor(dbInstance?: DatabaseInstance) {
    this.db = dbInstance ?? defaultDb;
  }

  // ============= BUDGET ITEMS =============

  async getBudgetItems(projectId: number): Promise<BudgetItem[]> {
    return await this.db.select().from(budgetItems).where(eq(budgetItems.projectId, projectId));
  }

  async createBudgetItem(itemData: InsertBudgetItem): Promise<BudgetItem> {
    const [item] = await this.db.insert(budgetItems).values(itemData).returning();
    return item;
  }

  // ============= TIME ENTRIES =============

  async getTimeEntries(taskId: number): Promise<TimeEntry[]> {
    return await this.db.select().from(timeEntries).where(eq(timeEntries.taskId, taskId)).orderBy(desc(timeEntries.date));
  }

  async createTimeEntry(entryData: InsertTimeEntry): Promise<TimeEntry> {
    const [entry] = await this.db.insert(timeEntries).values(entryData).returning();
    return entry;
  }

  // ============= EXPENSES =============

  async getExpenses(projectId: number): Promise<Expense[]> {
    return await this.db.select().from(expenses).where(eq(expenses.projectId, projectId)).orderBy(desc(expenses.date));
  }

  async createExpense(expenseData: InsertExpense): Promise<Expense> {
    const [expense] = await this.db.insert(expenses).values(expenseData).returning();
    return expense;
  }
}
