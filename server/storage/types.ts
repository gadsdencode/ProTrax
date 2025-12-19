/**
 * Storage layer type definitions and interfaces.
 * Defines contracts for all domain-specific storage operations.
 */

import type {
  User,
  UpsertUser,
  InsertUser,
  Project,
  InsertProject,
  Sprint,
  InsertSprint,
  Task,
  InsertTask,
  TaskHistory,
  InsertTaskHistory,
  TaskDependency,
  InsertTaskDependency,
  CustomField,
  InsertCustomField,
  TaskCustomFieldValue,
  Comment,
  InsertComment,
  FileAttachment,
  InsertFileAttachment,
  Risk,
  InsertRisk,
  BudgetItem,
  InsertBudgetItem,
  TimeEntry,
  InsertTimeEntry,
  Expense,
  InsertExpense,
  AutomationRule,
  InsertAutomationRule,
  DashboardWidget,
  InsertDashboardWidget,
  ProjectTemplate,
  InsertProjectTemplate,
  KanbanColumn,
  InsertKanbanColumn,
  ProjectStakeholder,
  InsertProjectStakeholder,
  Notification,
  InsertNotification,
  PaginationParams,
  PaginatedResult,
} from "@shared/schema";
import type session from "express-session";

// Extended pagination result with project statistics
export interface PaginatedProjectsResult extends PaginatedResult<Project> {
  stats?: {
    total: number;
    active: number;
    onHold: number;
    totalBudget: number;
  };
}

// Project with tasks creation result
export interface ProjectWithTasksResult {
  project: Project;
  tasks: Task[];
  failedTasks: { title: string; error: string }[];
}

// ============= DOMAIN STORAGE INTERFACES =============

export interface IUserStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
}

export interface IProjectStorage {
  getProjects(searchQuery?: string): Promise<Project[]>;
  getProjectsPaginated(searchQuery?: string, pagination?: PaginationParams): Promise<PaginatedProjectsResult>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  createProjectWithTasks(project: InsertProject, tasks: any[]): Promise<ProjectWithTasksResult>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;
}

export interface ISprintStorage {
  getSprints(projectId: number): Promise<Sprint[]>;
  getSprint(id: number): Promise<Sprint | undefined>;
  createSprint(sprint: InsertSprint): Promise<Sprint>;
  updateSprint(id: number, sprint: Partial<InsertSprint>): Promise<Sprint>;
  deleteSprint(id: number): Promise<void>;
}

export interface ITaskStorage {
  getTasks(projectId?: number, searchQuery?: string): Promise<Task[]>;
  getTasksPaginated(projectId?: number, searchQuery?: string, pagination?: PaginationParams): Promise<PaginatedResult<Task>>;
  getTask(id: number): Promise<Task | undefined>;
  getMyTasks(userId: string): Promise<Task[]>;
  getSubtasks(parentId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>, userId: string): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  
  // Task history
  createTaskHistory(history: InsertTaskHistory): Promise<TaskHistory>;
  getTaskHistory(taskId: number): Promise<TaskHistory[]>;
  getSprintHistory(sprintId: number, startDate?: Date, endDate?: Date): Promise<TaskHistory[]>;
  
  // Task dependencies
  getTaskDependencies(taskId: number): Promise<TaskDependency[]>;
  getProjectDependencies(projectId: number): Promise<TaskDependency[]>;
  getAllDependenciesForTasks(taskIds: number[]): Promise<TaskDependency[]>;
  createTaskDependency(dependency: InsertTaskDependency): Promise<TaskDependency>;
  deleteTaskDependency(id: number): Promise<void>;
  
  // Custom fields
  getCustomFields(projectId: number): Promise<CustomField[]>;
  createCustomField(field: InsertCustomField): Promise<CustomField>;
  deleteCustomField(id: number): Promise<void>;
  
  // Custom field values
  getTaskCustomFieldValues(taskId: number): Promise<TaskCustomFieldValue[]>;
  setTaskCustomFieldValue(taskId: number, customFieldId: number, value: string | null): Promise<TaskCustomFieldValue>;
  setTaskCustomFieldValuesBatch(taskId: number, values: Array<{ customFieldId: number, value: string | null }>): Promise<TaskCustomFieldValue[]>;
}

export interface ICollaborationStorage {
  // Comments
  getComments(taskId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  // File attachments
  getFileAttachments(taskId?: number, projectId?: number): Promise<FileAttachment[]>;
  getFileAttachment(id: number): Promise<FileAttachment | undefined>;
  createFileAttachment(attachment: InsertFileAttachment): Promise<FileAttachment>;
  deleteFileAttachment(id: number): Promise<void>;
  
  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
}

export interface IRiskStorage {
  getRisks(projectId: number): Promise<Risk[]>;
  createRisk(risk: InsertRisk): Promise<Risk>;
  updateRisk(id: number, risk: Partial<InsertRisk>): Promise<Risk>;
}

export interface IBudgetStorage {
  getBudgetItems(projectId: number): Promise<BudgetItem[]>;
  createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem>;
  
  // Time entries
  getTimeEntries(taskId: number): Promise<TimeEntry[]>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  
  // Expenses
  getExpenses(projectId: number): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
}

export interface IAutomationStorage {
  getAutomationRules(projectId: number): Promise<AutomationRule[]>;
  createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule>;
}

export interface IDashboardStorage {
  getDashboardWidgets(userId: string): Promise<DashboardWidget[]>;
  createDashboardWidget(widget: InsertDashboardWidget): Promise<DashboardWidget>;
}

export interface ITemplateStorage {
  getProjectTemplates(): Promise<ProjectTemplate[]>;
  createProjectTemplate(template: InsertProjectTemplate): Promise<ProjectTemplate>;
}

export interface IKanbanStorage {
  getKanbanColumns(projectId: number): Promise<KanbanColumn[]>;
  createKanbanColumn(column: InsertKanbanColumn): Promise<KanbanColumn>;
}

export interface IStakeholderStorage {
  getProjectStakeholders(projectId: number): Promise<ProjectStakeholder[]>;
  addProjectStakeholder(stakeholder: InsertProjectStakeholder): Promise<ProjectStakeholder>;
  removeProjectStakeholder(projectId: number, userId: string): Promise<void>;
  updateProjectStakeholder(id: number, updates: Partial<InsertProjectStakeholder>): Promise<ProjectStakeholder>;
}

// ============= COMPOSED STORAGE INTERFACE =============

export interface IStorage extends
  IUserStorage,
  IProjectStorage,
  ISprintStorage,
  ITaskStorage,
  ICollaborationStorage,
  IRiskStorage,
  IBudgetStorage,
  IAutomationStorage,
  IDashboardStorage,
  ITemplateStorage,
  IKanbanStorage,
  IStakeholderStorage {
  sessionStore: session.Store;
}

