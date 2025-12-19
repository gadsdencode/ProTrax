/**
 * Schema - Backward Compatibility Re-export
 * 
 * This file re-exports the modular schema system to maintain backward
 * compatibility with existing imports throughout the codebase.
 * 
 * The schema has been refactored into domain-specific modules:
 * - server/db/schema.ts: Database tables, enums, relations, and DB types
 * - shared/validation.ts: Zod validation schemas and Insert types
 * - shared/utils.ts: Sanitization utility functions
 * 
 * All functionality is preserved; this is purely an architectural improvement
 * following the Single Responsibility Principle (SRP).
 */

// ============= DATABASE SCHEMA =============
// Re-export all DB tables, enums, relations, and types
export {
  // Enums
  taskStatusEnum,
  taskPriorityEnum,
  dependencyTypeEnum,
  projectStatusEnum,
  riskProbabilityEnum,
  riskImpactEnum,
  customFieldTypeEnum,
  recurrenceTypeEnum,
  widgetTypeEnum,
  automationTriggerEnum,
  automationActionEnum,
  stakeholderRoleEnum,
  sprintStatusEnum,
  userRoleEnum,
  
  // Tables
  sessions,
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
  projectStakeholders,
  notifications,
  
  // Relations
  projectsRelations,
  tasksRelations,
  taskHistoryRelations,
  sprintsRelations,
  taskDependenciesRelations,
  usersRelations,
  projectStakeholdersRelations,
  
  // Database-derived types
  type User,
  type UpsertUser,
  type Project,
  type Sprint,
  type Task,
  type TaskHistory,
  type TaskDependency,
  type CustomField,
  type TaskCustomFieldValue,
  type Comment,
  type FileAttachment,
  type Risk,
  type BudgetItem,
  type TimeEntry,
  type Expense,
  type AutomationRule,
  type DashboardWidget,
  type ProjectTemplate,
  type KanbanColumn,
  type ProjectStakeholder,
  type Notification,
  type AsyncJob,
  
  // Async job enums
  asyncJobStatusEnum,
  asyncJobTypeEnum,
  asyncJobs,
} from "../server/db/schema";

// ============= VALIDATION SCHEMAS =============
// Re-export all Zod schemas and Insert types
export {
  // Pagination types
  type PaginationParams,
  type PaginatedResult,
  
  // Insert schemas
  insertUserSchema,
  insertProjectSchema,
  insertSprintSchema,
  insertTaskSchema,
  insertTaskHistorySchema,
  insertTaskDependencySchema,
  insertCustomFieldSchema,
  insertTaskCustomFieldValueSchema,
  insertCommentSchema,
  insertFileAttachmentSchema,
  insertRiskSchema,
  insertBudgetItemSchema,
  insertTimeEntrySchema,
  insertExpenseSchema,
  insertAutomationRuleSchema,
  insertDashboardWidgetSchema,
  insertProjectTemplateSchema,
  insertKanbanColumnSchema,
  insertProjectStakeholderSchema,
  insertNotificationSchema,
  
  // Insert types (derived from Zod schemas)
  type InsertUser,
  type InsertProject,
  type InsertSprint,
  type InsertTask,
  type InsertTaskHistory,
  type InsertTaskDependency,
  type InsertCustomField,
  type InsertTaskCustomFieldValue,
  type InsertComment,
  type InsertFileAttachment,
  type InsertRisk,
  type InsertBudgetItem,
  type InsertTimeEntry,
  type InsertExpense,
  type InsertAutomationRule,
  type InsertDashboardWidget,
  type InsertProjectTemplate,
  type InsertKanbanColumn,
  type InsertProjectStakeholder,
  type InsertNotification,
} from "./validation";

// ============= UTILITIES =============
// Re-export utility functions
export { sanitizeControlChars, truncateWithEllipsis } from "./utils";

// ============= EXTENDED TYPES =============
// Types that extend base types (kept here for backward compatibility)

import type { Project } from "../server/db/schema";
import type { PaginatedResult } from "./validation";

// Extended pagination result with statistics for projects
export interface PaginatedProjectsResult extends PaginatedResult<Project> {
  stats?: {
    total: number;
    active: number;
    onHold: number;
    totalBudget: number;
  };
}
