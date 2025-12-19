/**
 * Composed Storage Layer - Dependency Injection Container
 * 
 * This module composes all domain-specific storage classes into a single
 * unified storage interface using the composition pattern. Each domain
 * storage handles its own concerns while the composed class provides
 * a unified API that maintains backward compatibility.
 * 
 * Architecture:
 * - UserStorage: User authentication and profile management
 * - ProjectStorage: Project CRUD and atomic project+tasks creation
 * - SprintStorage: Sprint lifecycle management
 * - TaskStorage: Tasks, history, dependencies, custom fields
 * - CollaborationStorage: Comments, files, notifications
 * - RiskStorage: Risk management
 * - BudgetStorage: Budget, time entries, expenses
 * - AutomationStorage: Workflow automation rules
 * - DashboardStorage: User dashboard widgets
 * - TemplateStorage: Project templates
 * - KanbanStorage: Kanban board configuration
 * - StakeholderStorage: Project stakeholder management
 */

import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "../db";

// Import all domain storage classes
import { UserStorage } from "./UserStorage";
import { ProjectStorage } from "./ProjectStorage";
import { SprintStorage } from "./SprintStorage";
import { TaskStorage } from "./TaskStorage";
import { CollaborationStorage } from "./CollaborationStorage";
import { RiskStorage } from "./RiskStorage";
import { BudgetStorage } from "./BudgetStorage";
import { AutomationStorage } from "./AutomationStorage";
import { DashboardStorage } from "./DashboardStorage";
import { TemplateStorage } from "./TemplateStorage";
import { KanbanStorage } from "./KanbanStorage";
import { StakeholderStorage } from "./StakeholderStorage";

// Re-export types
export * from "./types";

// Re-export domain storage classes for direct use if needed
export { UserStorage } from "./UserStorage";
export { ProjectStorage } from "./ProjectStorage";
export { SprintStorage } from "./SprintStorage";
export { TaskStorage } from "./TaskStorage";
export { CollaborationStorage } from "./CollaborationStorage";
export { RiskStorage } from "./RiskStorage";
export { BudgetStorage } from "./BudgetStorage";
export { AutomationStorage } from "./AutomationStorage";
export { DashboardStorage } from "./DashboardStorage";
export { TemplateStorage } from "./TemplateStorage";
export { KanbanStorage } from "./KanbanStorage";
export { StakeholderStorage } from "./StakeholderStorage";

const PostgresSessionStore = connectPg(session);

/**
 * Composed DatabaseStorage class that delegates to domain-specific storage classes.
 * Implements the full IStorage interface while internally using composition.
 * 
 * This follows the Single Responsibility Principle (SRP) by delegating each
 * domain's operations to specialized storage classes, while maintaining a
 * unified API for backward compatibility.
 */
export class DatabaseStorage {
  // Session store for authentication
  sessionStore: session.Store;

  // Domain storage instances (composed, injected with db)
  private readonly userStorage: UserStorage;
  private readonly projectStorage: ProjectStorage;
  private readonly sprintStorage: SprintStorage;
  private readonly taskStorage: TaskStorage;
  private readonly collaborationStorage: CollaborationStorage;
  private readonly riskStorage: RiskStorage;
  private readonly budgetStorage: BudgetStorage;
  private readonly automationStorage: AutomationStorage;
  private readonly dashboardStorage: DashboardStorage;
  private readonly templateStorage: TemplateStorage;
  private readonly kanbanStorage: KanbanStorage;
  private readonly stakeholderStorage: StakeholderStorage;

  constructor() {
    // Initialize session store
    this.sessionStore = new PostgresSessionStore({ 
      pool: pool as any, 
      createTableIfMissing: false,
      tableName: 'sessions'
    });

    // Initialize domain storage instances
    this.userStorage = new UserStorage();
    this.projectStorage = new ProjectStorage();
    this.sprintStorage = new SprintStorage();
    this.taskStorage = new TaskStorage();
    this.collaborationStorage = new CollaborationStorage();
    this.riskStorage = new RiskStorage();
    this.budgetStorage = new BudgetStorage();
    this.automationStorage = new AutomationStorage();
    this.dashboardStorage = new DashboardStorage();
    this.templateStorage = new TemplateStorage();
    this.kanbanStorage = new KanbanStorage();
    this.stakeholderStorage = new StakeholderStorage();
  }

  // ============= USER OPERATIONS =============
  getUser = (id: string) => this.userStorage.getUser(id);
  getUserByUsername = (username: string) => this.userStorage.getUserByUsername(username);
  createUser = (...args: Parameters<UserStorage['createUser']>) => this.userStorage.createUser(...args);
  upsertUser = (...args: Parameters<UserStorage['upsertUser']>) => this.userStorage.upsertUser(...args);
  getAllUsers = () => this.userStorage.getAllUsers();
  updateUserRole = (...args: Parameters<UserStorage['updateUserRole']>) => this.userStorage.updateUserRole(...args);
  updateUser = (...args: Parameters<UserStorage['updateUser']>) => this.userStorage.updateUser(...args);
  deleteUser = (id: string) => this.userStorage.deleteUser(id);
  getUserCountByRole = () => this.userStorage.getUserCountByRole();
  ensureAdminExists = () => this.userStorage.ensureAdminExists();

  // ============= PROJECT OPERATIONS =============
  getProjects = (...args: Parameters<ProjectStorage['getProjects']>) => this.projectStorage.getProjects(...args);
  getProjectsPaginated = (...args: Parameters<ProjectStorage['getProjectsPaginated']>) => this.projectStorage.getProjectsPaginated(...args);
  getProject = (id: number) => this.projectStorage.getProject(id);
  createProject = (...args: Parameters<ProjectStorage['createProject']>) => this.projectStorage.createProject(...args);
  createProjectWithTasks = (...args: Parameters<ProjectStorage['createProjectWithTasks']>) => this.projectStorage.createProjectWithTasks(...args);
  updateProject = (...args: Parameters<ProjectStorage['updateProject']>) => this.projectStorage.updateProject(...args);
  deleteProject = (id: number) => this.projectStorage.deleteProject(id);

  // ============= SPRINT OPERATIONS =============
  getSprints = (projectId: number) => this.sprintStorage.getSprints(projectId);
  getSprint = (id: number) => this.sprintStorage.getSprint(id);
  createSprint = (...args: Parameters<SprintStorage['createSprint']>) => this.sprintStorage.createSprint(...args);
  updateSprint = (...args: Parameters<SprintStorage['updateSprint']>) => this.sprintStorage.updateSprint(...args);
  deleteSprint = (id: number) => this.sprintStorage.deleteSprint(id);

  // ============= TASK OPERATIONS =============
  getTasks = (...args: Parameters<TaskStorage['getTasks']>) => this.taskStorage.getTasks(...args);
  getTasksPaginated = (...args: Parameters<TaskStorage['getTasksPaginated']>) => this.taskStorage.getTasksPaginated(...args);
  getTask = (id: number) => this.taskStorage.getTask(id);
  getMyTasks = (userId: string) => this.taskStorage.getMyTasks(userId);
  getSubtasks = (parentId: number) => this.taskStorage.getSubtasks(parentId);
  createTask = (...args: Parameters<TaskStorage['createTask']>) => this.taskStorage.createTask(...args);
  updateTask = (...args: Parameters<TaskStorage['updateTask']>) => this.taskStorage.updateTask(...args);
  deleteTask = (id: number) => this.taskStorage.deleteTask(id);

  // Task history
  createTaskHistory = (...args: Parameters<TaskStorage['createTaskHistory']>) => this.taskStorage.createTaskHistory(...args);
  getTaskHistory = (taskId: number) => this.taskStorage.getTaskHistory(taskId);
  getSprintHistory = (...args: Parameters<TaskStorage['getSprintHistory']>) => this.taskStorage.getSprintHistory(...args);

  // Task dependencies
  getTaskDependencies = (taskId: number) => this.taskStorage.getTaskDependencies(taskId);
  getProjectDependencies = (projectId: number) => this.taskStorage.getProjectDependencies(projectId);
  getAllDependenciesForTasks = (taskIds: number[]) => this.taskStorage.getAllDependenciesForTasks(taskIds);
  createTaskDependency = (...args: Parameters<TaskStorage['createTaskDependency']>) => this.taskStorage.createTaskDependency(...args);
  deleteTaskDependency = (id: number) => this.taskStorage.deleteTaskDependency(id);

  // Custom fields
  getCustomFields = (projectId: number) => this.taskStorage.getCustomFields(projectId);
  createCustomField = (...args: Parameters<TaskStorage['createCustomField']>) => this.taskStorage.createCustomField(...args);
  deleteCustomField = (id: number) => this.taskStorage.deleteCustomField(id);

  // Custom field values
  getTaskCustomFieldValues = (taskId: number) => this.taskStorage.getTaskCustomFieldValues(taskId);
  setTaskCustomFieldValue = (...args: Parameters<TaskStorage['setTaskCustomFieldValue']>) => this.taskStorage.setTaskCustomFieldValue(...args);
  setTaskCustomFieldValuesBatch = (...args: Parameters<TaskStorage['setTaskCustomFieldValuesBatch']>) => this.taskStorage.setTaskCustomFieldValuesBatch(...args);

  // ============= COLLABORATION OPERATIONS =============
  getComments = (taskId: number) => this.collaborationStorage.getComments(taskId);
  createComment = (...args: Parameters<CollaborationStorage['createComment']>) => this.collaborationStorage.createComment(...args);

  getFileAttachments = (...args: Parameters<CollaborationStorage['getFileAttachments']>) => this.collaborationStorage.getFileAttachments(...args);
  getFileAttachment = (id: number) => this.collaborationStorage.getFileAttachment(id);
  createFileAttachment = (...args: Parameters<CollaborationStorage['createFileAttachment']>) => this.collaborationStorage.createFileAttachment(...args);
  deleteFileAttachment = (id: number) => this.collaborationStorage.deleteFileAttachment(id);

  getNotifications = (userId: string) => this.collaborationStorage.getNotifications(userId);
  createNotification = (...args: Parameters<CollaborationStorage['createNotification']>) => this.collaborationStorage.createNotification(...args);
  markNotificationRead = (id: number) => this.collaborationStorage.markNotificationRead(id);

  // ============= RISK OPERATIONS =============
  getRisks = (projectId: number) => this.riskStorage.getRisks(projectId);
  createRisk = (...args: Parameters<RiskStorage['createRisk']>) => this.riskStorage.createRisk(...args);
  updateRisk = (...args: Parameters<RiskStorage['updateRisk']>) => this.riskStorage.updateRisk(...args);

  // ============= BUDGET OPERATIONS =============
  getBudgetItems = (projectId: number) => this.budgetStorage.getBudgetItems(projectId);
  createBudgetItem = (...args: Parameters<BudgetStorage['createBudgetItem']>) => this.budgetStorage.createBudgetItem(...args);
  getTimeEntries = (taskId: number) => this.budgetStorage.getTimeEntries(taskId);
  createTimeEntry = (...args: Parameters<BudgetStorage['createTimeEntry']>) => this.budgetStorage.createTimeEntry(...args);
  getExpenses = (projectId: number) => this.budgetStorage.getExpenses(projectId);
  createExpense = (...args: Parameters<BudgetStorage['createExpense']>) => this.budgetStorage.createExpense(...args);

  // ============= AUTOMATION OPERATIONS =============
  getAutomationRules = (projectId: number) => this.automationStorage.getAutomationRules(projectId);
  createAutomationRule = (...args: Parameters<AutomationStorage['createAutomationRule']>) => this.automationStorage.createAutomationRule(...args);

  // ============= DASHBOARD OPERATIONS =============
  getDashboardWidgets = (userId: string) => this.dashboardStorage.getDashboardWidgets(userId);
  createDashboardWidget = (...args: Parameters<DashboardStorage['createDashboardWidget']>) => this.dashboardStorage.createDashboardWidget(...args);

  // ============= TEMPLATE OPERATIONS =============
  getProjectTemplates = () => this.templateStorage.getProjectTemplates();
  createProjectTemplate = (...args: Parameters<TemplateStorage['createProjectTemplate']>) => this.templateStorage.createProjectTemplate(...args);

  // ============= KANBAN OPERATIONS =============
  getKanbanColumns = (projectId: number) => this.kanbanStorage.getKanbanColumns(projectId);
  createKanbanColumn = (...args: Parameters<KanbanStorage['createKanbanColumn']>) => this.kanbanStorage.createKanbanColumn(...args);

  // ============= STAKEHOLDER OPERATIONS =============
  getProjectStakeholders = (projectId: number) => this.stakeholderStorage.getProjectStakeholders(projectId);
  addProjectStakeholder = (...args: Parameters<StakeholderStorage['addProjectStakeholder']>) => this.stakeholderStorage.addProjectStakeholder(...args);
  removeProjectStakeholder = (...args: Parameters<StakeholderStorage['removeProjectStakeholder']>) => this.stakeholderStorage.removeProjectStakeholder(...args);
  updateProjectStakeholder = (...args: Parameters<StakeholderStorage['updateProjectStakeholder']>) => this.stakeholderStorage.updateProjectStakeholder(...args);
}

// Singleton instance for backward compatibility
export const storage = new DatabaseStorage();

// Also export the interface from the original storage for compatibility
export type { IStorage } from "./types";
