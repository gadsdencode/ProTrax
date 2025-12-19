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
 */
export class DatabaseStorage {
  // Session store for authentication
  sessionStore: session.Store;

  // Domain storage instances (composed)
  private userStorage: UserStorage;
  private projectStorage: ProjectStorage;
  private sprintStorage: SprintStorage;
  private taskStorage: TaskStorage;
  private collaborationStorage: CollaborationStorage;
  private riskStorage: RiskStorage;
  private budgetStorage: BudgetStorage;
  private automationStorage: AutomationStorage;
  private dashboardStorage: DashboardStorage;
  private templateStorage: TemplateStorage;
  private kanbanStorage: KanbanStorage;
  private stakeholderStorage: StakeholderStorage;

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
  getUser = this.delegate('userStorage', 'getUser');
  getUserByUsername = this.delegate('userStorage', 'getUserByUsername');
  createUser = this.delegate('userStorage', 'createUser');
  upsertUser = this.delegate('userStorage', 'upsertUser');
  getAllUsers = this.delegate('userStorage', 'getAllUsers');

  // ============= PROJECT OPERATIONS =============
  getProjects = this.delegate('projectStorage', 'getProjects');
  getProjectsPaginated = this.delegate('projectStorage', 'getProjectsPaginated');
  getProject = this.delegate('projectStorage', 'getProject');
  createProject = this.delegate('projectStorage', 'createProject');
  createProjectWithTasks = this.delegate('projectStorage', 'createProjectWithTasks');
  updateProject = this.delegate('projectStorage', 'updateProject');
  deleteProject = this.delegate('projectStorage', 'deleteProject');

  // ============= SPRINT OPERATIONS =============
  getSprints = this.delegate('sprintStorage', 'getSprints');
  getSprint = this.delegate('sprintStorage', 'getSprint');
  createSprint = this.delegate('sprintStorage', 'createSprint');
  updateSprint = this.delegate('sprintStorage', 'updateSprint');
  deleteSprint = this.delegate('sprintStorage', 'deleteSprint');

  // ============= TASK OPERATIONS =============
  getTasks = this.delegate('taskStorage', 'getTasks');
  getTasksPaginated = this.delegate('taskStorage', 'getTasksPaginated');
  getTask = this.delegate('taskStorage', 'getTask');
  getMyTasks = this.delegate('taskStorage', 'getMyTasks');
  getSubtasks = this.delegate('taskStorage', 'getSubtasks');
  createTask = this.delegate('taskStorage', 'createTask');
  updateTask = this.delegate('taskStorage', 'updateTask');
  deleteTask = this.delegate('taskStorage', 'deleteTask');

  // Task history
  createTaskHistory = this.delegate('taskStorage', 'createTaskHistory');
  getTaskHistory = this.delegate('taskStorage', 'getTaskHistory');
  getSprintHistory = this.delegate('taskStorage', 'getSprintHistory');

  // Task dependencies
  getTaskDependencies = this.delegate('taskStorage', 'getTaskDependencies');
  getProjectDependencies = this.delegate('taskStorage', 'getProjectDependencies');
  getAllDependenciesForTasks = this.delegate('taskStorage', 'getAllDependenciesForTasks');
  createTaskDependency = this.delegate('taskStorage', 'createTaskDependency');
  deleteTaskDependency = this.delegate('taskStorage', 'deleteTaskDependency');

  // Custom fields
  getCustomFields = this.delegate('taskStorage', 'getCustomFields');
  createCustomField = this.delegate('taskStorage', 'createCustomField');
  deleteCustomField = this.delegate('taskStorage', 'deleteCustomField');

  // Custom field values
  getTaskCustomFieldValues = this.delegate('taskStorage', 'getTaskCustomFieldValues');
  setTaskCustomFieldValue = this.delegate('taskStorage', 'setTaskCustomFieldValue');
  setTaskCustomFieldValuesBatch = this.delegate('taskStorage', 'setTaskCustomFieldValuesBatch');

  // ============= COLLABORATION OPERATIONS =============
  getComments = this.delegate('collaborationStorage', 'getComments');
  createComment = this.delegate('collaborationStorage', 'createComment');

  getFileAttachments = this.delegate('collaborationStorage', 'getFileAttachments');
  getFileAttachment = this.delegate('collaborationStorage', 'getFileAttachment');
  createFileAttachment = this.delegate('collaborationStorage', 'createFileAttachment');
  deleteFileAttachment = this.delegate('collaborationStorage', 'deleteFileAttachment');

  getNotifications = this.delegate('collaborationStorage', 'getNotifications');
  createNotification = this.delegate('collaborationStorage', 'createNotification');
  markNotificationRead = this.delegate('collaborationStorage', 'markNotificationRead');

  // ============= RISK OPERATIONS =============
  getRisks = this.delegate('riskStorage', 'getRisks');
  createRisk = this.delegate('riskStorage', 'createRisk');
  updateRisk = this.delegate('riskStorage', 'updateRisk');

  // ============= BUDGET OPERATIONS =============
  getBudgetItems = this.delegate('budgetStorage', 'getBudgetItems');
  createBudgetItem = this.delegate('budgetStorage', 'createBudgetItem');
  getTimeEntries = this.delegate('budgetStorage', 'getTimeEntries');
  createTimeEntry = this.delegate('budgetStorage', 'createTimeEntry');
  getExpenses = this.delegate('budgetStorage', 'getExpenses');
  createExpense = this.delegate('budgetStorage', 'createExpense');

  // ============= AUTOMATION OPERATIONS =============
  getAutomationRules = this.delegate('automationStorage', 'getAutomationRules');
  createAutomationRule = this.delegate('automationStorage', 'createAutomationRule');

  // ============= DASHBOARD OPERATIONS =============
  getDashboardWidgets = this.delegate('dashboardStorage', 'getDashboardWidgets');
  createDashboardWidget = this.delegate('dashboardStorage', 'createDashboardWidget');

  // ============= TEMPLATE OPERATIONS =============
  getProjectTemplates = this.delegate('templateStorage', 'getProjectTemplates');
  createProjectTemplate = this.delegate('templateStorage', 'createProjectTemplate');

  // ============= KANBAN OPERATIONS =============
  getKanbanColumns = this.delegate('kanbanStorage', 'getKanbanColumns');
  createKanbanColumn = this.delegate('kanbanStorage', 'createKanbanColumn');

  // ============= STAKEHOLDER OPERATIONS =============
  getProjectStakeholders = this.delegate('stakeholderStorage', 'getProjectStakeholders');
  addProjectStakeholder = this.delegate('stakeholderStorage', 'addProjectStakeholder');
  removeProjectStakeholder = this.delegate('stakeholderStorage', 'removeProjectStakeholder');
  updateProjectStakeholder = this.delegate('stakeholderStorage', 'updateProjectStakeholder');

  /**
   * Helper method to create a delegate function that forwards calls to the appropriate domain storage.
   * Uses TypeScript's type system to ensure type safety.
   */
  private delegate<T extends keyof this, M extends keyof this[T]>(
    storageName: T,
    methodName: M
  ): this[T][M] {
    const storage = this[storageName];
    const method = storage[methodName];
    if (typeof method === 'function') {
      return method.bind(storage) as this[T][M];
    }
    return method;
  }
}

// Singleton instance for backward compatibility
export const storage = new DatabaseStorage();

// Also export the interface from the original storage for compatibility
export type { IStorage } from "./types";

