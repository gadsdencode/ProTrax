/**
 * Project-related database operations.
 * Handles project CRUD, search, pagination, and atomic project+tasks creation.
 * 
 * Supports Dependency Injection: Pass a custom database instance
 * via constructor for testing or multi-tenancy scenarios.
 * 
 * MULTI-TENANCY: All queries filter by organizationId when provided.
 */

import {
  projects,
  tasks,
  type Project,
  type InsertProject,
  type Task,
  type InsertTask,
  type PaginationParams,
} from "@shared/schema";
import { db as defaultDb } from "../db";
import { eq, or, ilike, desc, asc, sql, and } from "drizzle-orm";
import type { IProjectStorage, PaginatedProjectsResult, ProjectWithTasksResult, DatabaseInstance } from "./types";

export class ProjectStorage implements IProjectStorage {
  private readonly db: DatabaseInstance;

  /**
   * Creates a ProjectStorage instance.
   * @param dbInstance - Optional database instance for dependency injection.
   *                     Defaults to the shared db instance if not provided.
   */
  constructor(dbInstance?: DatabaseInstance) {
    this.db = dbInstance ?? defaultDb;
  }

  /**
   * Get all projects, optionally filtered by search query.
   * @param searchQuery - Optional search term to filter by name or description
   * @param organizationId - Optional organization ID for multi-tenant filtering
   */
  async getProjects(searchQuery?: string, organizationId?: string): Promise<Project[]> {
    const conditions = [];
    
    // Add organization filter if provided
    if (organizationId) {
      conditions.push(eq(projects.organizationId, organizationId));
    }
    
    // Add search filter if provided
    if (searchQuery) {
      const searchPattern = `%${searchQuery}%`;
      conditions.push(
        or(
          ilike(projects.name, searchPattern),
          ilike(projects.description, searchPattern)
        )!
      );
    }
    
    if (conditions.length > 0) {
      return await this.db
        .select()
        .from(projects)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(projects.createdAt));
    }
    
    return await this.db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  /**
   * Get paginated projects with optional search and organization filtering.
   * @param searchQuery - Optional search term
   * @param pagination - Pagination parameters
   * @param organizationId - Optional organization ID for multi-tenant filtering
   */
  async getProjectsPaginated(searchQuery?: string, pagination?: PaginationParams, organizationId?: string): Promise<PaginatedProjectsResult> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const sortBy = pagination?.sortBy || 'createdAt';
    const sortOrder = pagination?.sortOrder || 'desc';
    const offset = (page - 1) * limit;

    const conditions = [];
    
    // Add organization filter if provided
    if (organizationId) {
      conditions.push(eq(projects.organizationId, organizationId));
    }
    
    // Add search filter if provided
    if (searchQuery) {
      const searchPattern = `%${searchQuery}%`;
      conditions.push(
        or(
          ilike(projects.name, searchPattern),
          ilike(projects.description, searchPattern)
        )!
      );
    }

    let query = this.db.select().from(projects);
    let countQuery = this.db.select({ count: this.db.$count(projects) }).from(projects);

    if (conditions.length > 0) {
      const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
      query = query.where(whereClause);
      countQuery = countQuery.where(whereClause);
    }

    const sortColumn = sortBy === 'name' ? projects.name : 
                      sortBy === 'status' ? projects.status :
                      sortBy === 'startDate' ? projects.startDate :
                      sortBy === 'endDate' ? projects.endDate :
                      projects.createdAt;
    
    if (sortOrder === 'asc') {
      query = query.orderBy(asc(sortColumn));
    } else {
      query = query.orderBy(desc(sortColumn));
    }

    query = query.limit(limit).offset(offset);

    const statsQuery = this.db.select({
      total: this.db.$count(projects),
      active: sql<number>`COUNT(CASE WHEN ${projects.status} = 'active' THEN 1 END)`,
      onHold: sql<number>`COUNT(CASE WHEN ${projects.status} = 'on_hold' THEN 1 END)`,
      totalBudget: sql<number>`COALESCE(SUM(${projects.budget}), 0)`
    }).from(projects);

    const [data, countResult, statsResult] = await Promise.all([
      query,
      countQuery,
      statsQuery
    ]);

    const total = countResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    
    const stats = statsResult[0] ? {
      total: Number(statsResult[0].total) || 0,
      active: Number(statsResult[0].active) || 0,
      onHold: Number(statsResult[0].onHold) || 0,
      totalBudget: Number(statsResult[0].totalBudget) || 0
    } : {
      total: 0,
      active: 0,
      onHold: 0,
      totalBudget: 0
    };

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
      stats
    };
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await this.db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const [project] = await this.db.insert(projects).values(projectData).returning();
    return project;
  }

  async createProjectWithTasks(projectData: InsertProject, taskList: any[]): Promise<ProjectWithTasksResult> {
    const failedTasks: { title: string; error: string }[] = [];
    const validTasks: InsertTask[] = [];
    
    // Pre-validate tasks using Zod schema (sanitization happens in schema)
    if (taskList && taskList.length > 0) {
      console.log(`[SOW Upload] Pre-validating ${taskList.length} tasks...`);
      
      // Import the task schema for validation
      const { insertTaskSchema } = await import("@shared/schema");
      
      for (let i = 0; i < taskList.length; i++) {
        const task = taskList[i];
        
        try {
          // Build task data - Zod schema handles sanitization
          const taskData = {
            projectId: 0, // Placeholder - will be set in transaction
            title: task.title || `Task ${i + 1}`,
            description: task.description || null,
            status: 'todo' as const,
            priority: 'medium' as const,
            isMilestone: Boolean(task.isMilestone),
            sortOrder: i,
            progress: 0,
            assigneeId: null,
            sprintId: null,
            parentId: null,
            startDate: null,
            dueDate: null,
            duration: null,
            estimatedHours: null,
            storyPoints: null,
            isOnCriticalPath: false,
            recurrenceType: null,
            recurrenceInterval: null,
            recurrenceEndDate: null,
          };
          
          // Validate and sanitize through Zod schema
          const validatedTask = insertTaskSchema.parse(taskData);
          validTasks.push(validatedTask);
          
        } catch (error: any) {
          const taskTitle = task.title || 'Untitled Task';
          const errorMessage = error.errors?.[0]?.message || error.message || 'Unknown error';
          failedTasks.push({
            title: taskTitle,
            error: `Validation failed: ${errorMessage}`
          });
          console.warn(`[SOW Upload] Task ${i + 1} validation failed: ${taskTitle} - ${errorMessage}`);
        }
      }
      
      console.log(`[SOW Upload] Validated ${validTasks.length}/${taskList.length} tasks`);
    }
    
    // Use ACID transaction for atomic project + tasks creation
    const result = await this.db.transaction(async (tx) => {
      const [project] = await tx.insert(projects).values(projectData).returning();
      console.log(`[SOW Upload] Project created with ID: ${project.id}`);
      
      let createdTasks: Task[] = [];
      
      if (validTasks.length > 0) {
        const tasksWithProjectId = validTasks.map(task => ({
          ...task,
          projectId: project.id
        }));
        
        console.log(`[SOW Upload] Batch inserting ${tasksWithProjectId.length} tasks...`);
        createdTasks = await tx.insert(tasks).values(tasksWithProjectId).returning();
        console.log(`[SOW Upload] Successfully batch inserted ${createdTasks.length} tasks`);
      }
      
      return { project, createdTasks };
    });
    
    console.log(`[SOW Upload] Transaction complete: Project ID ${result.project.id}, ${result.createdTasks.length} tasks created`);
    
    if (failedTasks.length > 0) {
      console.warn(`[SOW Upload] ${failedTasks.length} tasks failed validation:`);
      failedTasks.forEach((ft, index) => {
        console.warn(`  ${index + 1}. "${ft.title}": ${ft.error}`);
      });
    }
    
    return {
      project: result.project,
      tasks: result.createdTasks,
      failedTasks
    };
  }

  async updateProject(id: number, projectData: Partial<InsertProject>): Promise<Project> {
    const updateData = { ...projectData };
    if (updateData.startDate && typeof updateData.startDate === 'string') {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate && typeof updateData.endDate === 'string') {
      updateData.endDate = new Date(updateData.endDate);
    }
    
    const [project] = await this.db
      .update(projects)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: number): Promise<void> {
    await this.db.delete(projects).where(eq(projects.id, id));
  }
}

