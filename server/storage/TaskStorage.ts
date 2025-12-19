/**
 * Task-related database operations.
 * Handles task CRUD, history, dependencies, custom fields, and search.
 */

import {
  tasks,
  taskHistory,
  taskDependencies,
  customFields,
  taskCustomFieldValues,
  type Task,
  type InsertTask,
  type TaskHistory,
  type InsertTaskHistory,
  type TaskDependency,
  type InsertTaskDependency,
  type CustomField,
  type InsertCustomField,
  type TaskCustomFieldValue,
  type PaginationParams,
  type PaginatedResult,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, asc, or, ilike, gte, lte } from "drizzle-orm";
import { debugLogTagged } from "../utils/debug";
import type { ITaskStorage } from "./types";

export class TaskStorage implements ITaskStorage {
  // ============= CORE TASK OPERATIONS =============

  async getTasks(projectId?: number, searchQuery?: string): Promise<Task[]> {
    debugLogTagged('STORAGE DEBUG', `getTasks called with projectId: ${projectId}, searchQuery: ${searchQuery}`);
    
    if (projectId && !searchQuery) {
      debugLogTagged('STORAGE DEBUG', `Using direct query for projectId: ${projectId}`);
      const result = await db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, projectId))
        .orderBy(asc(tasks.sortOrder));
      debugLogTagged('STORAGE DEBUG', `Direct query returned ${result.length} tasks`);
      return result;
    }

    if (projectId && searchQuery) {
      debugLogTagged('STORAGE DEBUG', `Using optimized query for projectId: ${projectId} and searchQuery: ${searchQuery}`);
      const searchPattern = `%${searchQuery}%`;
      const result = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.projectId, projectId),
            or(
              ilike(tasks.title, searchPattern),
              ilike(tasks.description, searchPattern)
            )
          )
        )
        .orderBy(asc(tasks.sortOrder));
      debugLogTagged('STORAGE DEBUG', `Optimized combined query returned ${result.length} tasks`);
      if (result.length > 0) {
        debugLogTagged('STORAGE DEBUG', `First task: id=${result[0].id}, projectId=${result[0].projectId}, title=${result[0].title}`);
      }
      return result;
    }
    
    if (searchQuery) {
      debugLogTagged('STORAGE DEBUG', `Using search-only query for searchQuery: ${searchQuery}`);
      const searchPattern = `%${searchQuery}%`;
      const result = await db
        .select()
        .from(tasks)
        .where(
          or(
            ilike(tasks.title, searchPattern),
            ilike(tasks.description, searchPattern)
          )
        )
        .orderBy(desc(tasks.createdAt));
      debugLogTagged('STORAGE DEBUG', `Search-only query returned ${result.length} tasks`);
      return result;
    }
    
    debugLogTagged('STORAGE DEBUG', 'Returning all tasks');
    const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    debugLogTagged('STORAGE DEBUG', `Query without conditions returned ${allTasks.length} tasks`);
    return allTasks;
  }

  async getTasksPaginated(projectId?: number, searchQuery?: string, pagination?: PaginationParams): Promise<PaginatedResult<Task>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const sortBy = pagination?.sortBy || 'sortOrder'; 
    const sortOrder = pagination?.sortOrder || 'asc';
    const offset = (page - 1) * limit;

    let query = db.select().from(tasks);
    let countQuery = db.select({ count: db.$count(tasks) }).from(tasks);
    
    const conditions = [];
    
    if (projectId) {
      conditions.push(eq(tasks.projectId, projectId));
    }
    
    if (searchQuery) {
      const searchPattern = `%${searchQuery}%`;
      conditions.push(
        or(
          ilike(tasks.title, searchPattern),
          ilike(tasks.description, searchPattern)
        )
      );
    }
    
    if (conditions.length > 0) {
      const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
      query = query.where(whereClause);
      countQuery = countQuery.where(whereClause);
    }

    const sortColumn = sortBy === 'title' ? tasks.title :
                      sortBy === 'status' ? tasks.status :
                      sortBy === 'priority' ? tasks.priority :
                      sortBy === 'dueDate' ? tasks.dueDate :
                      sortBy === 'createdAt' ? tasks.createdAt :
                      sortBy === 'progress' ? tasks.progress :
                      tasks.sortOrder;
    
    if (sortOrder === 'asc') {
      query = query.orderBy(asc(sortColumn));
    } else {
      query = query.orderBy(desc(sortColumn));
    }

    query = query.limit(limit).offset(offset);

    const [data, countResult] = await Promise.all([
      query,
      countQuery
    ]);

    const total = countResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getMyTasks(userId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.assigneeId, userId)).orderBy(asc(tasks.dueDate));
  }

  async getSubtasks(parentId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.parentId, parentId)).orderBy(asc(tasks.sortOrder));
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(taskData).returning();
    return task;
  }

  async updateTask(id: number, taskData: Partial<InsertTask>, userId: string): Promise<Task> {
    const existingTask = await this.getTask(id);
    if (!existingTask) {
      throw new Error(`Task with id ${id} not found`);
    }

    const [updatedTask] = await db
      .update(tasks)
      .set({ ...taskData, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();

    // Track changes in history
    const fieldsToTrack = ['status', 'storyPoints', 'sprintId', 'assigneeId', 'progress'];
    for (const field of fieldsToTrack) {
      if (field in taskData && taskData[field as keyof typeof taskData] !== existingTask[field as keyof typeof existingTask]) {
        await this.createTaskHistory({
          taskId: id,
          projectId: existingTask.projectId,
          sprintId: updatedTask.sprintId,
          fieldName: field,
          oldValue: JSON.stringify(existingTask[field as keyof typeof existingTask]),
          newValue: JSON.stringify(taskData[field as keyof typeof taskData]),
          changedBy: userId,
          status: updatedTask.status,
          storyPoints: updatedTask.storyPoints,
        });
      }
    }

    return updatedTask;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // ============= TASK HISTORY =============

  async createTaskHistory(historyData: InsertTaskHistory): Promise<TaskHistory> {
    const [history] = await db.insert(taskHistory).values(historyData).returning();
    return history;
  }

  async getTaskHistory(taskId: number): Promise<TaskHistory[]> {
    return await db
      .select()
      .from(taskHistory)
      .where(eq(taskHistory.taskId, taskId))
      .orderBy(desc(taskHistory.changedAt));
  }

  async getSprintHistory(sprintId: number, startDate?: Date, endDate?: Date): Promise<TaskHistory[]> {
    let query = db
      .select()
      .from(taskHistory)
      .where(eq(taskHistory.sprintId, sprintId));

    if (startDate && endDate) {
      const conditions = [
        eq(taskHistory.sprintId, sprintId),
        gte(taskHistory.changedAt, startDate),
        lte(taskHistory.changedAt, endDate),
      ];
      query = db
        .select()
        .from(taskHistory)
        .where(and(...conditions));
    }

    return await query.orderBy(asc(taskHistory.changedAt));
  }

  // ============= TASK DEPENDENCIES =============

  async getTaskDependencies(taskId: number): Promise<TaskDependency[]> {
    return await db
      .select()
      .from(taskDependencies)
      .where(eq(taskDependencies.successorId, taskId));
  }

  async getProjectDependencies(projectId: number): Promise<TaskDependency[]> {
    const projectTasks = await this.getTasks(projectId);
    const taskIds = projectTasks.map(t => t.id);
    
    if (taskIds.length === 0) return [];
    
    return await db
      .select()
      .from(taskDependencies)
      .where(
        or(
          eq(taskDependencies.predecessorId, taskIds[0]),
          eq(taskDependencies.successorId, taskIds[0]),
          ...taskIds.slice(1).flatMap(id => [
            eq(taskDependencies.predecessorId, id),
            eq(taskDependencies.successorId, id)
          ])
        )
      );
  }

  async getAllDependenciesForTasks(taskIds: number[]): Promise<TaskDependency[]> {
    if (taskIds.length === 0) return [];
    
    return await db
      .select()
      .from(taskDependencies)
      .where(
        or(
          eq(taskDependencies.predecessorId, taskIds[0]),
          eq(taskDependencies.successorId, taskIds[0]),
          ...taskIds.slice(1).flatMap(id => [
            eq(taskDependencies.predecessorId, id),
            eq(taskDependencies.successorId, id)
          ])
        )
      );
  }

  async createTaskDependency(dependencyData: InsertTaskDependency): Promise<TaskDependency> {
    const [dependency] = await db.insert(taskDependencies).values(dependencyData).returning();
    return dependency;
  }

  async deleteTaskDependency(id: number): Promise<void> {
    await db.delete(taskDependencies).where(eq(taskDependencies.id, id));
  }

  // ============= CUSTOM FIELDS =============

  async getCustomFields(projectId: number): Promise<CustomField[]> {
    return await db.select().from(customFields).where(eq(customFields.projectId, projectId));
  }

  async createCustomField(fieldData: InsertCustomField): Promise<CustomField> {
    const [field] = await db.insert(customFields).values(fieldData).returning();
    return field;
  }

  async deleteCustomField(id: number): Promise<void> {
    await db.delete(customFields).where(eq(customFields.id, id));
  }

  // ============= CUSTOM FIELD VALUES =============

  async getTaskCustomFieldValues(taskId: number): Promise<TaskCustomFieldValue[]> {
    return await db.select().from(taskCustomFieldValues).where(eq(taskCustomFieldValues.taskId, taskId));
  }

  async setTaskCustomFieldValue(taskId: number, customFieldId: number, value: string | null): Promise<TaskCustomFieldValue> {
    const [existing] = await db
      .select()
      .from(taskCustomFieldValues)
      .where(
        and(
          eq(taskCustomFieldValues.taskId, taskId),
          eq(taskCustomFieldValues.customFieldId, customFieldId)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(taskCustomFieldValues)
        .set({ value })
        .where(eq(taskCustomFieldValues.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(taskCustomFieldValues)
        .values({
          taskId,
          customFieldId,
          value
        })
        .returning();
      return created;
    }
  }

  async setTaskCustomFieldValuesBatch(taskId: number, values: Array<{ customFieldId: number, value: string | null }>): Promise<TaskCustomFieldValue[]> {
    const existingValues = await db
      .select()
      .from(taskCustomFieldValues)
      .where(eq(taskCustomFieldValues.taskId, taskId));

    const existingMap = new Map(
      existingValues.map(v => [`${v.taskId}-${v.customFieldId}`, v])
    );

    const results: TaskCustomFieldValue[] = [];
    const toUpdate: Array<{ id: number, value: string | null }> = [];
    const toInsert: Array<{ taskId: number, customFieldId: number, value: string | null }> = [];

    for (const { customFieldId, value } of values) {
      const key = `${taskId}-${customFieldId}`;
      const existing = existingMap.get(key);

      if (existing) {
        toUpdate.push({ id: existing.id, value });
      } else {
        toInsert.push({ taskId, customFieldId, value });
      }
    }

    if (toUpdate.length > 0) {
      await db.transaction(async (tx) => {
        for (const { id, value } of toUpdate) {
          const [updated] = await tx
            .update(taskCustomFieldValues)
            .set({ value })
            .where(eq(taskCustomFieldValues.id, id))
            .returning();
          results.push(updated);
        }
      });
    }

    if (toInsert.length > 0) {
      const inserted = await db
        .insert(taskCustomFieldValues)
        .values(toInsert)
        .returning();
      results.push(...inserted);
    }

    return results;
  }
}

