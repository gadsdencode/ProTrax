import {
  users,
  projects,
  tasks,
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
  type Project,
  type InsertProject,
  type Task,
  type InsertTask,
  type InsertTaskDependency,
  type TaskDependency,
  type InsertCustomField,
  type CustomField,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, or, ilike } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Project operations
  getProjects(searchQuery?: string): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;
  
  // Task operations
  getTasks(projectId?: number, searchQuery?: string): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  getMyTasks(userId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  
  // Task dependency operations
  getTaskDependencies(taskId: number): Promise<TaskDependency[]>;
  createTaskDependency(dependency: InsertTaskDependency): Promise<TaskDependency>;
  deleteTaskDependency(id: number): Promise<void>;
  
  // Custom field operations
  getCustomFields(projectId: number): Promise<CustomField[]>;
  createCustomField(field: InsertCustomField): Promise<CustomField>;
  
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

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(projectData).returning();
    return project;
  }

  async updateProject(id: number, projectData: Partial<InsertProject>): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({ ...projectData, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Task operations
  async getTasks(projectId?: number, searchQuery?: string): Promise<Task[]> {
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
      return await db
        .select()
        .from(tasks)
        .where(whereClause)
        .orderBy(projectId ? asc(tasks.sortOrder) : desc(tasks.createdAt));
    }
    
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getMyTasks(userId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.assigneeId, userId)).orderBy(asc(tasks.dueDate));
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(taskData).returning();
    return task;
  }

  async updateTask(id: number, taskData: Partial<InsertTask>): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({ ...taskData, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
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
}

export const storage = new DatabaseStorage();
