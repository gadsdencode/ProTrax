/**
 * Validation Schemas
 * 
 * Contains all Zod validation schemas for data validation and sanitization.
 * These schemas are used for API input validation and form validation.
 */

import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import table definitions for schema generation
import {
  users,
  organizations,
  organizationMembers,
  organizationInvitations,
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
  budgetItems,
  timeEntries,
  expenses,
  automationRules,
  dashboardWidgets,
  projectTemplates,
  kanbanColumns,
  projectStakeholders,
  notifications,
} from "../server/db/schema";

// Import utility functions for sanitization
import { sanitizeControlChars, truncateWithEllipsis } from "./utils";

// ============= PAGINATION TYPES =============

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ============= INSERT SCHEMAS =============

// ============= ORGANIZATION SCHEMAS =============

// Organization schema with sanitization
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  name: z.string()
    .min(1, "Organization name is required")
    .max(255, "Organization name must be less than 255 characters")
    .transform((val) => sanitizeControlChars(val).trim()),
  slug: z.string()
    .min(2, "Slug must be at least 2 characters")
    .max(100, "Slug must be less than 100 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.union([
    z.string().transform((val) => sanitizeControlChars(val).trim()).transform((val) => val || null),
    z.null()
  ]).optional(),
});
export type InsertOrganizationData = z.infer<typeof insertOrganizationSchema>;

// Organization member schema
export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  joinedAt: true,
});
export type InsertOrganizationMemberData = z.infer<typeof insertOrganizationMemberSchema>;

// Organization invitation schema
export const insertOrganizationInvitationSchema = createInsertSchema(organizationInvitations).omit({ 
  id: true, 
  createdAt: true,
  token: true,
  acceptedAt: true,
}).extend({
  email: z.string().email("Valid email is required"),
  expiresAt: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val),
});
export type InsertOrganizationInvitationData = z.infer<typeof insertOrganizationInvitationSchema>;

// Insert schema for user registration
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertUser = z.infer<typeof insertUserSchema>;

// Project schema with sanitization
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  // Name: Required, sanitized, max 255 chars (matches DB varchar(255))
  name: z.string()
    .min(1, "Project name is required")
    .transform((val) => sanitizeControlChars(val).trim())
    .transform((val) => truncateWithEllipsis(val, 255))
    .refine((val) => val.length > 0, "Project name cannot be empty after sanitization"),
  // Description: Optional, sanitized
  description: z.union([
    z.string()
      .transform((val) => sanitizeControlChars(val).trim())
      .transform((val) => val || null),
    z.null()
  ]).optional(),
  // Charter: Optional, sanitized (rich text)
  charter: z.union([
    z.string()
      .transform((val) => sanitizeControlChars(val).trim())
      .transform((val) => val || null),
    z.null()
  ]).optional(),
  // Date fields with string-to-Date transformation
  startDate: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val).optional(),
  endDate: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val).optional(),
});
export type InsertProject = z.infer<typeof insertProjectSchema>;

// Sprint schema with sanitization
export const insertSprintSchema = createInsertSchema(sprints).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  // Name: Required, sanitized, max 255 chars
  name: z.string()
    .min(1, "Sprint name is required")
    .transform((val) => sanitizeControlChars(val).trim())
    .transform((val) => truncateWithEllipsis(val, 255))
    .refine((val) => val.length > 0, "Sprint name cannot be empty"),
  // Goal: Optional, sanitized
  goal: z.union([
    z.string()
      .transform((val) => sanitizeControlChars(val).trim())
      .transform((val) => val || null),
    z.null()
  ]).optional(),
  // Date fields
  startDate: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val),
  endDate: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val),
});
export type InsertSprint = z.infer<typeof insertSprintSchema>;

// Task schema with sanitization
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  // Title: Required, sanitized, max 500 chars (matches DB varchar(500))
  title: z.string()
    .min(1, "Task title is required")
    .transform((val) => sanitizeControlChars(val).trim())
    .transform((val) => truncateWithEllipsis(val, 500))
    .refine((val) => val.length > 0, "Task title cannot be empty after sanitization"),
  // Description: Optional, sanitized (no length limit - stored as text)
  description: z.union([
    z.string()
      .transform((val) => sanitizeControlChars(val).trim())
      .transform((val) => val || null),
    z.null()
  ]).optional(),
  // Date fields with string-to-Date transformation
  startDate: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val).optional(),
  dueDate: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val).optional(),
  recurrenceEndDate: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val).optional(),
  // Numeric field transformation
  estimatedHours: z.union([z.string(), z.number()]).transform(val => typeof val === 'number' ? val.toString() : val).optional(),
});
export type InsertTask = z.infer<typeof insertTaskSchema>;

// Task history schema
export const insertTaskHistorySchema = createInsertSchema(taskHistory).omit({ id: true, changedAt: true });
export type InsertTaskHistory = z.infer<typeof insertTaskHistorySchema>;

// Task dependency schema
export const insertTaskDependencySchema = createInsertSchema(taskDependencies).omit({ id: true, createdAt: true });
export type InsertTaskDependency = z.infer<typeof insertTaskDependencySchema>;

// Custom field schema
export const insertCustomFieldSchema = createInsertSchema(customFields).omit({ id: true, createdAt: true });
export type InsertCustomField = z.infer<typeof insertCustomFieldSchema>;

// Task custom field value schema
export const insertTaskCustomFieldValueSchema = createInsertSchema(taskCustomFieldValues).omit({ id: true, createdAt: true });
export type InsertTaskCustomFieldValue = z.infer<typeof insertTaskCustomFieldValueSchema>;

// Comment schema with sanitization
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  // Content: Required, sanitized (allows rich text but removes control chars)
  content: z.string()
    .min(1, "Comment content is required")
    .transform((val) => sanitizeControlChars(val).trim())
    .refine((val) => val.length > 0, "Comment cannot be empty"),
});
export type InsertComment = z.infer<typeof insertCommentSchema>;

// File attachment schema
export const insertFileAttachmentSchema = createInsertSchema(fileAttachments).omit({ id: true, createdAt: true });
export type InsertFileAttachment = z.infer<typeof insertFileAttachmentSchema>;

// Risk schema with sanitization
export const insertRiskSchema = createInsertSchema(risks).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  // Title: Required, sanitized, max 500 chars
  title: z.string()
    .min(1, "Risk title is required")
    .transform((val) => sanitizeControlChars(val).trim())
    .transform((val) => truncateWithEllipsis(val, 500))
    .refine((val) => val.length > 0, "Risk title cannot be empty"),
  // Description: Optional, sanitized
  description: z.union([
    z.string()
      .transform((val) => sanitizeControlChars(val).trim())
      .transform((val) => val || null),
    z.null()
  ]).optional(),
  // Mitigation plan: Optional, sanitized
  mitigationPlan: z.union([
    z.string()
      .transform((val) => sanitizeControlChars(val).trim())
      .transform((val) => val || null),
    z.null()
  ]).optional(),
});
export type InsertRisk = z.infer<typeof insertRiskSchema>;

// Budget item schema
export const insertBudgetItemSchema = createInsertSchema(budgetItems).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;

// Time entry schema with date transformation
export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({ id: true, createdAt: true }).extend({
  date: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val),
});
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;

// Expense schema with date transformation
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true }).extend({
  date: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val),
});
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// Automation rule schema
export const insertAutomationRuleSchema = createInsertSchema(automationRules).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;

// Dashboard widget schema
export const insertDashboardWidgetSchema = createInsertSchema(dashboardWidgets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDashboardWidget = z.infer<typeof insertDashboardWidgetSchema>;

// Project template schema
export const insertProjectTemplateSchema = createInsertSchema(projectTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProjectTemplate = z.infer<typeof insertProjectTemplateSchema>;

// Kanban column schema
export const insertKanbanColumnSchema = createInsertSchema(kanbanColumns).omit({ id: true, createdAt: true });
export type InsertKanbanColumn = z.infer<typeof insertKanbanColumnSchema>;

// Project stakeholder schema
export const insertProjectStakeholderSchema = createInsertSchema(projectStakeholders).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProjectStakeholder = z.infer<typeof insertProjectStakeholderSchema>;

// Notification schema
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

