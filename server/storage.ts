import {
  users,
  projects,
  sprints,
  tasks,
  taskHistory,
  taskDependencies,
  customFields,
  taskCustomFieldValues,
  comments,
  fileAttachments,
  risks,
  resourceCapacity,
  budgetItems,
  timeEntries,
  expenses,
  automationRules,
  dashboardWidgets,
  projectTemplates,
  kanbanColumns,
  notifications,
  projectStakeholders,
  type User,
  type UpsertUser,
  type InsertUser,
  type Project,
  type InsertProject,
  type Sprint,
  type InsertSprint,
  type Task,
  type InsertTask,
  type TaskHistory,
  type InsertTaskHistory,
  type InsertTaskDependency,
  type TaskDependency,
  type InsertCustomField,
  type CustomField,
  type InsertTaskCustomFieldValue,
  type TaskCustomFieldValue,
  type InsertComment,
  type Comment,
  type InsertFileAttachment,
  type FileAttachment,
  type InsertRisk,
  type Risk,
  type InsertBudgetItem,
  type BudgetItem,
  type InsertTimeEntry,
  type TimeEntry,
  type InsertExpense,
  type Expense,
  type InsertAutomationRule,
  type AutomationRule,
  type InsertDashboardWidget,
  type DashboardWidget,
  type InsertProjectTemplate,
  type ProjectTemplate,
  type InsertKanbanColumn,
  type KanbanColumn,
  type InsertProjectStakeholder,
  type ProjectStakeholder,
  type InsertNotification,
  type Notification,
  type PaginationParams,
  type PaginatedResult,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, desc, asc, or, ilike, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { debugLogTagged } from "./utils/debug";

export interface IStorage {
  // User operations (blueprint: javascript_auth_all_persistance)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Session store for authentication (blueprint: javascript_auth_all_persistance)
  sessionStore: session.Store;
  
  // Project operations
  getProjects(searchQuery?: string): Promise<Project[]>;
  getProjectsPaginated(searchQuery?: string, pagination?: PaginationParams): Promise<PaginatedProjectsResult>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  createProjectWithTasks(project: InsertProject, tasks: any[]): Promise<{
    project: Project;
    tasks: Task[];
    failedTasks: { title: string; error: string }[];
  }>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;
  
  // Sprint operations
  getSprints(projectId: number): Promise<Sprint[]>;
  getSprint(id: number): Promise<Sprint | undefined>;
  createSprint(sprint: InsertSprint): Promise<Sprint>;
  updateSprint(id: number, sprint: Partial<InsertSprint>): Promise<Sprint>;
  deleteSprint(id: number): Promise<void>;
  
  // Task operations
  getTasks(projectId?: number, searchQuery?: string): Promise<Task[]>;
  getTasksPaginated(projectId?: number, searchQuery?: string, pagination?: PaginationParams): Promise<PaginatedResult<Task>>;
  getTask(id: number): Promise<Task | undefined>;
  getMyTasks(userId: string): Promise<Task[]>;
  getSubtasks(parentId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>, userId: string): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  
  // Task history operations
  createTaskHistory(history: InsertTaskHistory): Promise<TaskHistory>;
  getTaskHistory(taskId: number): Promise<TaskHistory[]>;
  getSprintHistory(sprintId: number, startDate?: Date, endDate?: Date): Promise<TaskHistory[]>;
  
  // Task dependency operations
  getTaskDependencies(taskId: number): Promise<TaskDependency[]>;
  getProjectDependencies(projectId: number): Promise<TaskDependency[]>;
  getAllDependenciesForTasks(taskIds: number[]): Promise<TaskDependency[]>;
  createTaskDependency(dependency: InsertTaskDependency): Promise<TaskDependency>;
  deleteTaskDependency(id: number): Promise<void>;
  
  // Custom field operations
  getCustomFields(projectId: number): Promise<CustomField[]>;
  createCustomField(field: InsertCustomField): Promise<CustomField>;
  deleteCustomField(id: number): Promise<void>;
  
  // Task custom field value operations
  getTaskCustomFieldValues(taskId: number): Promise<TaskCustomFieldValue[]>;
  setTaskCustomFieldValue(taskId: number, customFieldId: number, value: string | null): Promise<TaskCustomFieldValue>;
  setTaskCustomFieldValuesBatch(taskId: number, values: Array<{ customFieldId: number, value: string | null }>): Promise<TaskCustomFieldValue[]>;
  
  // Comment operations
  getComments(taskId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  // File attachment operations
  getFileAttachments(taskId?: number, projectId?: number): Promise<FileAttachment[]>;
  getFileAttachment(id: number): Promise<FileAttachment | undefined>;
  createFileAttachment(attachment: InsertFileAttachment): Promise<FileAttachment>;
  deleteFileAttachment(id: number): Promise<void>;
  
  // Risk operations
  getRisks(projectId: number): Promise<Risk[]>;
  createRisk(risk: InsertRisk): Promise<Risk>;
  updateRisk(id: number, risk: Partial<InsertRisk>): Promise<Risk>;
  
  // Budget operations
  getBudgetItems(projectId: number): Promise<BudgetItem[]>;
  createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem>;
  
  // Time entry operations
  getTimeEntries(taskId: number): Promise<TimeEntry[]>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  
  // Expense operations
  getExpenses(projectId: number): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  
  // Automation rule operations
  getAutomationRules(projectId: number): Promise<AutomationRule[]>;
  createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule>;
  
  // Dashboard widget operations
  getDashboardWidgets(userId: string): Promise<DashboardWidget[]>;
  createDashboardWidget(widget: InsertDashboardWidget): Promise<DashboardWidget>;
  
  // Project template operations
  getProjectTemplates(): Promise<ProjectTemplate[]>;
  createProjectTemplate(template: InsertProjectTemplate): Promise<ProjectTemplate>;
  
  // Kanban column operations
  getKanbanColumns(projectId: number): Promise<KanbanColumn[]>;
  createKanbanColumn(column: InsertKanbanColumn): Promise<KanbanColumn>;
  
  // Project stakeholder operations
  getProjectStakeholders(projectId: number): Promise<ProjectStakeholder[]>;
  addProjectStakeholder(stakeholder: InsertProjectStakeholder): Promise<ProjectStakeholder>;
  removeProjectStakeholder(projectId: number, userId: string): Promise<void>;
  updateProjectStakeholder(id: number, updates: Partial<InsertProjectStakeholder>): Promise<ProjectStakeholder>;
  
  // Notification operations
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  // Session store for authentication (blueprint: javascript_auth_all_persistance)
  sessionStore: session.Store;

  constructor() {
    // Use existing sessions table from schema (blueprint: javascript_auth_all_persistance)
    this.sessionStore = new PostgresSessionStore({ 
      pool: pool as any, 
      createTableIfMissing: false,
      tableName: 'sessions' // Match our schema table name
    });
  }

  // User operations (blueprint: javascript_auth_all_persistance)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Project operations
  async getProjects(searchQuery?: string): Promise<Project[]> {
    if (searchQuery) {
      const searchPattern = `%${searchQuery}%`;
      return await db
        .select()
        .from(projects)
        .where(
          or(
            ilike(projects.name, searchPattern),
            ilike(projects.description, searchPattern)
          )
        )
        .orderBy(desc(projects.createdAt));
    }
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProjectsPaginated(searchQuery?: string, pagination?: PaginationParams): Promise<PaginatedProjectsResult> {
    // Set default pagination values
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const sortBy = pagination?.sortBy || 'createdAt';
    const sortOrder = pagination?.sortOrder || 'desc';
    const offset = (page - 1) * limit;

    // Build the where clause
    let query = db.select().from(projects);
    let countQuery = db.select({ count: db.$count(projects) }).from(projects);

    if (searchQuery) {
      const searchPattern = `%${searchQuery}%`;
      const whereClause = or(
        ilike(projects.name, searchPattern),
        ilike(projects.description, searchPattern)
      );
      query = query.where(whereClause);
      countQuery = countQuery.where(whereClause);
    }

    // Apply sorting
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

    // Apply pagination
    query = query.limit(limit).offset(offset);

    // Calculate statistics for all projects (not just paginated results)
    const statsQuery = db.select({
      total: db.$count(projects),
      active: sql<number>`COUNT(CASE WHEN ${projects.status} = 'active' THEN 1 END)`,
      onHold: sql<number>`COUNT(CASE WHEN ${projects.status} = 'on_hold' THEN 1 END)`,
      totalBudget: sql<number>`COALESCE(SUM(${projects.budget}), 0)`
    }).from(projects);

    // Execute queries in parallel
    const [data, countResult, statsResult] = await Promise.all([
      query,
      countQuery,
      statsQuery
    ]);

    const total = countResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    
    // Parse stats with proper type conversions
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
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(projectData).returning();
    return project;
  }

  async createProjectWithTasks(projectData: InsertProject, taskList: any[]): Promise<{
    project: Project;
    tasks: Task[];
    failedTasks: { title: string; error: string }[];
  }> {
    const createdTasks: Task[] = [];
    const failedTasks: { title: string; error: string }[] = [];
    
    // First, create the project - this should always succeed
    const [project] = await db.insert(projects).values(projectData).returning();
    console.log(`[SOW Upload] Project created with ID: ${project.id}`);
    
    // Now attempt to create each task individually
    // SAVE ALL THAT CAN BE SAVED - NO ROLLBACK
    if (taskList && taskList.length > 0) {
      console.log(`[SOW Upload] Attempting to create ${taskList.length} tasks...`);
      
      for (let i = 0; i < taskList.length; i++) {
        const task = taskList[i];
        
        try {
          // Ensure title is not too long (max 500 chars) and handle special characters
          let title = task.title || 'Untitled Task';
          
          // Truncate title if too long (varchar(500) limit)
          if (title.length > 500) {
            console.warn(`[SOW Upload] Task ${i + 1} title truncated from ${title.length} to 500 chars`);
            title = title.substring(0, 497) + '...';
          }
          
          // Clean up any problematic characters
          title = title.replace(/[\x00-\x1F\x7F]/g, '').trim(); // Remove control characters
          if (!title) {
            title = `Task ${i + 1}`; // Fallback if title becomes empty
          }
          
          // Prepare description with same safety checks
          let description = task.description || null;
          if (description) {
            description = description.replace(/[\x00-\x1F\x7F]/g, '').trim();
          }
          
          // Validate and prepare task data with all defaults
          const taskData = {
            projectId: project.id,
            title: title,
            description: description,
            status: 'todo' as const,
            priority: 'medium' as const,
            isMilestone: Boolean(task.isMilestone),
            sortOrder: i,
            progress: 0,
            // Ensure all optional fields have proper defaults
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
          
          // Log what we're about to create for debugging
          console.log(`[SOW Upload] Creating task ${i + 1}/${taskList.length}: "${title}"`);
          
          // Try to create this task
          const [createdTask] = await db.insert(tasks).values(taskData).returning();
          createdTasks.push(createdTask);
          console.log(`[SOW Upload] Task ${i + 1}/${taskList.length} SAVED: "${createdTask.title}" (ID: ${createdTask.id})`);
          
        } catch (error: any) {
          // This task failed - log detailed error information
          const errorMessage = error.message || 'Unknown error';
          const taskTitle = task.title || 'Untitled Task';
          
          // Log full error details for debugging
          console.error(`[SOW Upload] Task ${i + 1}/${taskList.length} FAILED:`, {
            title: taskTitle,
            error: errorMessage,
            errorCode: error.code,
            errorDetail: error.detail,
            taskData: task
          });
          
          failedTasks.push({ 
            title: taskTitle, 
            error: `${errorMessage}${error.detail ? ` - ${error.detail}` : ''}` 
          });
          
          // CONTINUE PROCESSING OTHER TASKS - DON'T STOP
        }
      }
      
      console.log(`[SOW Upload] Final Results: ${createdTasks.length} tasks saved, ${failedTasks.length} tasks failed`);
      
      // If any tasks failed, log a summary
      if (failedTasks.length > 0) {
        console.warn(`[SOW Upload] Failed tasks summary:`);
        failedTasks.forEach((ft, index) => {
          console.warn(`  ${index + 1}. "${ft.title}": ${ft.error}`);
        });
      }
    }
    
    return {
      project,
      tasks: createdTasks,
      failedTasks
    };
  }

  async updateProject(id: number, projectData: Partial<InsertProject>): Promise<Project> {
    // Convert date strings to Date objects if they exist
    const updateData = { ...projectData };
    if (updateData.startDate && typeof updateData.startDate === 'string') {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate && typeof updateData.endDate === 'string') {
      updateData.endDate = new Date(updateData.endDate);
    }
    
    const [project] = await db
      .update(projects)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Sprint operations
  async getSprints(projectId: number): Promise<Sprint[]> {
    return await db.select().from(sprints).where(eq(sprints.projectId, projectId)).orderBy(desc(sprints.startDate));
  }

  async getSprint(id: number): Promise<Sprint | undefined> {
    const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id));
    return sprint;
  }

  async createSprint(sprintData: InsertSprint): Promise<Sprint> {
    const [sprint] = await db.insert(sprints).values(sprintData).returning();
    return sprint;
  }

  async updateSprint(id: number, sprintData: Partial<InsertSprint>): Promise<Sprint> {
    const [sprint] = await db
      .update(sprints)
      .set({ ...sprintData, updatedAt: new Date() })
      .where(eq(sprints.id, id))
      .returning();
    return sprint;
  }

  async deleteSprint(id: number): Promise<void> {
    await db.delete(sprints).where(eq(sprints.id, id));
  }

  // Task operations
  async getTasks(projectId?: number, searchQuery?: string): Promise<Task[]> {
    debugLogTagged('STORAGE DEBUG', `getTasks called with projectId: ${projectId}, searchQuery: ${searchQuery}`);
    
    // Optimize direct query when only projectId is provided
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

    // Optimize query when both projectId and searchQuery are present
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
    
    // Query when only searchQuery is provided
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
    
    // Return all tasks when no filters are provided
    debugLogTagged('STORAGE DEBUG', 'Returning all tasks');
    const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    debugLogTagged('STORAGE DEBUG', `Query without conditions returned ${allTasks.length} tasks`);
    return allTasks;
  }

  async getTasksPaginated(projectId?: number, searchQuery?: string, pagination?: PaginationParams): Promise<PaginatedResult<Task>> {
    // Set default pagination values
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20; // Higher default limit for tasks
    const sortBy = pagination?.sortBy || 'sortOrder'; 
    const sortOrder = pagination?.sortOrder || 'asc';
    const offset = (page - 1) * limit;

    // Build the query
    let query = db.select().from(tasks);
    let countQuery = db.select({ count: db.$count(tasks) }).from(tasks);
    
    // Build where clause conditions
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
    
    // Apply where conditions if any
    if (conditions.length > 0) {
      const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
      query = query.where(whereClause);
      countQuery = countQuery.where(whereClause);
    }

    // Apply sorting
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

    // Apply pagination
    query = query.limit(limit).offset(offset);

    // Execute queries
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
    // Get the existing task to compare changes
    const existingTask = await this.getTask(id);
    if (!existingTask) {
      throw new Error(`Task with id ${id} not found`);
    }

    // Update the task
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

  // Task dependency operations
  async getTaskDependencies(taskId: number): Promise<TaskDependency[]> {
    return await db
      .select()
      .from(taskDependencies)
      .where(eq(taskDependencies.successorId, taskId));
  }

  async getProjectDependencies(projectId: number): Promise<TaskDependency[]> {
    // Get all tasks for the project first
    const projectTasks = await this.getTasks(projectId);
    const taskIds = projectTasks.map(t => t.id);
    
    if (taskIds.length === 0) return [];
    
    // Get all dependencies where either predecessor or successor is in the project
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

  // Custom field operations
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

  // Task custom field value operations
  async getTaskCustomFieldValues(taskId: number): Promise<TaskCustomFieldValue[]> {
    return await db.select().from(taskCustomFieldValues).where(eq(taskCustomFieldValues.taskId, taskId));
  }

  async setTaskCustomFieldValue(taskId: number, customFieldId: number, value: string | null): Promise<TaskCustomFieldValue> {
    // Check if value already exists
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
      // Update existing value
      const [updated] = await db
        .update(taskCustomFieldValues)
        .set({ value })
        .where(eq(taskCustomFieldValues.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new value
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
    // Get all existing values for this task
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

    // Categorize values into updates and inserts
    for (const { customFieldId, value } of values) {
      const key = `${taskId}-${customFieldId}`;
      const existing = existingMap.get(key);

      if (existing) {
        toUpdate.push({ id: existing.id, value });
      } else {
        toInsert.push({ taskId, customFieldId, value });
      }
    }

    // Perform batch updates
    if (toUpdate.length > 0) {
      // Use a transaction to update multiple values efficiently
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

    // Perform batch insert
    if (toInsert.length > 0) {
      const inserted = await db
        .insert(taskCustomFieldValues)
        .values(toInsert)
        .returning();
      results.push(...inserted);
    }

    return results;
  }

  // Comment operations
  async getComments(taskId: number): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.taskId, taskId)).orderBy(asc(comments.createdAt));
  }

  async createComment(commentData: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(commentData).returning();
    return comment;
  }

  // File attachment operations
  async getFileAttachments(taskId?: number, projectId?: number): Promise<FileAttachment[]> {
    if (taskId) {
      return await db.select().from(fileAttachments).where(eq(fileAttachments.taskId, taskId));
    }
    if (projectId) {
      return await db.select().from(fileAttachments).where(eq(fileAttachments.projectId, projectId));
    }
    return await db.select().from(fileAttachments);
  }

  async getFileAttachment(id: number): Promise<FileAttachment | undefined> {
    const [attachment] = await db.select().from(fileAttachments).where(eq(fileAttachments.id, id));
    return attachment;
  }

  async createFileAttachment(attachmentData: InsertFileAttachment): Promise<FileAttachment> {
    const [attachment] = await db.insert(fileAttachments).values(attachmentData).returning();
    return attachment;
  }

  async deleteFileAttachment(id: number): Promise<void> {
    await db.delete(fileAttachments).where(eq(fileAttachments.id, id));
  }

  // Risk operations
  async getRisks(projectId: number): Promise<Risk[]> {
    return await db.select().from(risks).where(eq(risks.projectId, projectId)).orderBy(desc(risks.riskScore));
  }

  async createRisk(riskData: InsertRisk): Promise<Risk> {
    const [risk] = await db.insert(risks).values(riskData).returning();
    return risk;
  }

  async updateRisk(id: number, riskData: Partial<InsertRisk>): Promise<Risk> {
    const [risk] = await db
      .update(risks)
      .set({ ...riskData, updatedAt: new Date() })
      .where(eq(risks.id, id))
      .returning();
    return risk;
  }

  // Budget operations
  async getBudgetItems(projectId: number): Promise<BudgetItem[]> {
    return await db.select().from(budgetItems).where(eq(budgetItems.projectId, projectId));
  }

  async createBudgetItem(itemData: InsertBudgetItem): Promise<BudgetItem> {
    const [item] = await db.insert(budgetItems).values(itemData).returning();
    return item;
  }

  // Time entry operations
  async getTimeEntries(taskId: number): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries).where(eq(timeEntries.taskId, taskId)).orderBy(desc(timeEntries.date));
  }

  async createTimeEntry(entryData: InsertTimeEntry): Promise<TimeEntry> {
    const [entry] = await db.insert(timeEntries).values(entryData).returning();
    return entry;
  }

  // Expense operations
  async getExpenses(projectId: number): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.projectId, projectId)).orderBy(desc(expenses.date));
  }

  async createExpense(expenseData: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(expenseData).returning();
    return expense;
  }

  // Automation rule operations
  async getAutomationRules(projectId: number): Promise<AutomationRule[]> {
    return await db.select().from(automationRules).where(eq(automationRules.projectId, projectId));
  }

  async createAutomationRule(ruleData: InsertAutomationRule): Promise<AutomationRule> {
    const [rule] = await db.insert(automationRules).values(ruleData).returning();
    return rule;
  }

  // Dashboard widget operations
  async getDashboardWidgets(userId: string): Promise<DashboardWidget[]> {
    return await db.select().from(dashboardWidgets).where(eq(dashboardWidgets.userId, userId)).orderBy(asc(dashboardWidgets.position));
  }

  async createDashboardWidget(widgetData: InsertDashboardWidget): Promise<DashboardWidget> {
    const [widget] = await db.insert(dashboardWidgets).values(widgetData).returning();
    return widget;
  }

  // Project template operations
  async getProjectTemplates(): Promise<ProjectTemplate[]> {
    return await db.select().from(projectTemplates).orderBy(desc(projectTemplates.createdAt));
  }

  async createProjectTemplate(templateData: InsertProjectTemplate): Promise<ProjectTemplate> {
    const [template] = await db.insert(projectTemplates).values(templateData).returning();
    return template;
  }

  // Kanban column operations
  async getKanbanColumns(projectId: number): Promise<KanbanColumn[]> {
    return await db.select().from(kanbanColumns).where(eq(kanbanColumns.projectId, projectId)).orderBy(asc(kanbanColumns.position));
  }

  async createKanbanColumn(columnData: InsertKanbanColumn): Promise<KanbanColumn> {
    const [column] = await db.insert(kanbanColumns).values(columnData).returning();
    return column;
  }

  // Project stakeholder operations
  async getProjectStakeholders(projectId: number): Promise<ProjectStakeholder[]> {
    return await db.select().from(projectStakeholders).where(eq(projectStakeholders.projectId, projectId));
  }

  async addProjectStakeholder(stakeholderData: InsertProjectStakeholder): Promise<ProjectStakeholder> {
    const [stakeholder] = await db.insert(projectStakeholders).values(stakeholderData).returning();
    return stakeholder;
  }

  async removeProjectStakeholder(projectId: number, userId: string): Promise<void> {
    await db.delete(projectStakeholders).where(
      and(
        eq(projectStakeholders.projectId, projectId),
        eq(projectStakeholders.userId, userId)
      )
    );
  }

  async updateProjectStakeholder(id: number, updates: Partial<InsertProjectStakeholder>): Promise<ProjectStakeholder> {
    const [stakeholder] = await db
      .update(projectStakeholders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectStakeholders.id, id))
      .returning();
    return stakeholder;
  }

  // Notification operations
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(notificationData).returning();
    return notification;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  // Task history operations
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
}

export const storage = new DatabaseStorage();
