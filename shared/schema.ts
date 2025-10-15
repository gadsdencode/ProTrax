import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  pgEnum,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============= ENUMS =============

export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'review', 'done', 'blocked']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);
export const dependencyTypeEnum = pgEnum('dependency_type', ['fs', 'ss', 'ff', 'sf']); // finish-to-start, start-to-start, finish-to-finish, start-to-finish
export const projectStatusEnum = pgEnum('project_status', ['planning', 'active', 'on_hold', 'completed', 'cancelled']);
export const riskProbabilityEnum = pgEnum('risk_probability', ['very_low', 'low', 'medium', 'high', 'very_high']);
export const riskImpactEnum = pgEnum('risk_impact', ['very_low', 'low', 'medium', 'high', 'very_high']);
export const customFieldTypeEnum = pgEnum('custom_field_type', ['text', 'number', 'date', 'dropdown']);
export const recurrenceTypeEnum = pgEnum('recurrence_type', ['daily', 'weekly', 'monthly', 'custom']);
export const widgetTypeEnum = pgEnum('widget_type', ['my_tasks', 'budget_vs_actual', 'team_workload', 'burndown', 'project_health', 'upcoming_milestones']);
export const automationTriggerEnum = pgEnum('automation_trigger', ['task_created', 'task_status_changed', 'task_assigned', 'due_date_approaching']);
export const automationActionEnum = pgEnum('automation_action', ['change_status', 'assign_user', 'send_notification', 'create_task']);
export const stakeholderRoleEnum = pgEnum('stakeholder_role', ['sponsor', 'reviewer', 'observer', 'team_member', 'client', 'vendor']);
export const sprintStatusEnum = pgEnum('sprint_status', ['planned', 'active', 'completed']);

// ============= AUTH TABLES (Required for Replit Auth) =============

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  weeklyCapacity: integer("weekly_capacity").default(40), // hours per week
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

// Insert schema for user registration (blueprint: javascript_auth_all_persistance)
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertUser = z.infer<typeof insertUserSchema>;

// ============= PROJECT MANAGEMENT TABLES =============

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  charter: text("charter"), // Rich text project charter/scope
  managerId: varchar("manager_id").references(() => users.id),
  status: projectStatusEnum("status").default('planning'),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  color: varchar("color", { length: 7 }).default('#3B82F6'), // hex color for visual identification
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sprints = pgTable("sprints", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  goal: text("goal"),
  status: sprintStatusEnum("status").default('planned'),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  sprintId: integer("sprint_id").references(() => sprints.id, { onDelete: 'set null' }),
  parentId: integer("parent_id").references((): any => tasks.id, { onDelete: 'cascade' }), // For subtasks/WBS hierarchy
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"), // Rich text
  assigneeId: varchar("assignee_id").references(() => users.id),
  status: taskStatusEnum("status").default('todo'),
  priority: taskPriorityEnum("priority").default('medium'),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  duration: integer("duration"), // in hours
  progress: integer("progress").default(0), // 0-100
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
  storyPoints: integer("story_points"),
  isMilestone: boolean("is_milestone").default(false),
  isOnCriticalPath: boolean("is_on_critical_path").default(false),
  recurrenceType: recurrenceTypeEnum("recurrence_type"),
  recurrenceInterval: integer("recurrence_interval"),
  recurrenceEndDate: timestamp("recurrence_end_date"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Track all task changes for accurate burndown/CFD metrics
export const taskHistory = pgTable("task_history", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  sprintId: integer("sprint_id").references(() => sprints.id, { onDelete: 'cascade' }),
  fieldName: varchar("field_name", { length: 100 }).notNull(), // e.g., 'status', 'storyPoints', 'sprintId'
  oldValue: text("old_value"), // JSON stringified for complex values
  newValue: text("new_value"), // JSON stringified for complex values
  changedBy: varchar("changed_by").references(() => users.id).notNull(),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  // Denormalized fields for quick queries
  status: taskStatusEnum("status"), // Current status after change
  storyPoints: integer("story_points"), // Current story points after change
});

export const taskDependencies = pgTable("task_dependencies", {
  id: serial("id").primaryKey(),
  predecessorId: integer("predecessor_id").references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  successorId: integer("successor_id").references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  type: dependencyTypeEnum("type").default('fs'),
  lag: integer("lag").default(0), // lag in days (can be negative for lead time)
  createdAt: timestamp("created_at").defaultNow(),
});

export const customFields = pgTable("custom_fields", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: customFieldTypeEnum("type").notNull(),
  options: text("options").array(), // For dropdown type
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskCustomFieldValues = pgTable("task_custom_field_values", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  customFieldId: integer("custom_field_id").references(() => customFields.id, { onDelete: 'cascade' }).notNull(),
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(), // Rich text with @mentions
  mentions: text("mentions").array(), // Array of user IDs mentioned
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const fileAttachments = pgTable("file_attachments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: 'cascade' }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size"), // in bytes
  mimeType: varchar("mime_type", { length: 100 }),
  storageUrl: text("storage_url").notNull(), // Object storage URL
  version: integer("version").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const risks = pgTable("risks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  probability: riskProbabilityEnum("probability").default('medium'),
  impact: riskImpactEnum("impact").default('medium'),
  riskScore: integer("risk_score"), // Calculated: probability * impact
  mitigationPlan: text("mitigation_plan"),
  ownerId: varchar("owner_id").references(() => users.id),
  status: varchar("status", { length: 50 }).default('identified'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const resourceCapacity = pgTable("resource_capacity", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: timestamp("date").notNull(),
  availableHours: decimal("available_hours", { precision: 5, scale: 2 }).default('8.00'),
  allocatedHours: decimal("allocated_hours", { precision: 5, scale: 2 }).default('0.00'),
  isTimeOff: boolean("is_time_off").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const budgetItems = pgTable("budget_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  plannedAmount: decimal("planned_amount", { precision: 12, scale: 2 }).notNull(),
  actualAmount: decimal("actual_amount", { precision: 12, scale: 2 }).default('0.00'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  hours: decimal("hours", { precision: 5, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  description: text("description"),
  isBillable: boolean("is_billable").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const automationRules = pgTable("automation_rules", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  trigger: automationTriggerEnum("trigger").notNull(),
  triggerConditions: jsonb("trigger_conditions"), // Flexible JSON for conditions
  action: automationActionEnum("action").notNull(),
  actionParams: jsonb("action_params"), // Flexible JSON for action parameters
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: widgetTypeEnum("type").notNull(),
  config: jsonb("config"), // Widget-specific configuration
  position: integer("position").default(0),
  width: integer("width").default(6), // Grid width (1-12)
  height: integer("height").default(4), // Grid height
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectTemplates = pgTable("project_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id),
  templateData: jsonb("template_data").notNull(), // Complete project structure
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const kanbanColumns = pgTable("kanban_columns", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  wipLimit: integer("wip_limit"),
  position: integer("position").default(0),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectStakeholders = pgTable("project_stakeholders", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: stakeholderRoleEnum("role").default('team_member'),
  receiveEmailReports: boolean("receive_email_reports").default(true),
  canEditProject: boolean("can_edit_project").default(false),
  addedBy: varchar("added_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'mention', 'assignment', 'deadline', etc.
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  link: varchar("link", { length: 500 }),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============= RELATIONS =============

export const projectsRelations = relations(projects, ({ one, many }) => ({
  manager: one(users, { fields: [projects.managerId], references: [users.id] }),
  tasks: many(tasks),
  sprints: many(sprints),
  customFields: many(customFields),
  risks: many(risks),
  budgetItems: many(budgetItems),
  expenses: many(expenses),
  automationRules: many(automationRules),
  kanbanColumns: many(kanbanColumns),
  fileAttachments: many(fileAttachments),
  stakeholders: many(projectStakeholders),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  sprint: one(sprints, { fields: [tasks.sprintId], references: [sprints.id] }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
  parent: one(tasks, { fields: [tasks.parentId], references: [tasks.id] }),
  subtasks: many(tasks),
  predecessors: many(taskDependencies, { relationName: 'successorDependencies' }),
  successors: many(taskDependencies, { relationName: 'predecessorDependencies' }),
  comments: many(comments),
  fileAttachments: many(fileAttachments),
  customFieldValues: many(taskCustomFieldValues),
  timeEntries: many(timeEntries),
  history: many(taskHistory),
}));

export const taskHistoryRelations = relations(taskHistory, ({ one }) => ({
  task: one(tasks, { fields: [taskHistory.taskId], references: [tasks.id] }),
  project: one(projects, { fields: [taskHistory.projectId], references: [projects.id] }),
  sprint: one(sprints, { fields: [taskHistory.sprintId], references: [sprints.id] }),
  changedByUser: one(users, { fields: [taskHistory.changedBy], references: [users.id] }),
}));

export const sprintsRelations = relations(sprints, ({ one, many }) => ({
  project: one(projects, { fields: [sprints.projectId], references: [projects.id] }),
  tasks: many(tasks),
}));

export const taskDependenciesRelations = relations(taskDependencies, ({ one }) => ({
  predecessor: one(tasks, { fields: [taskDependencies.predecessorId], references: [tasks.id], relationName: 'predecessorDependencies' }),
  successor: one(tasks, { fields: [taskDependencies.successorId], references: [tasks.id], relationName: 'successorDependencies' }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  managedProjects: many(projects),
  assignedTasks: many(tasks),
  comments: many(comments),
  fileAttachments: many(fileAttachments),
  ownedRisks: many(risks),
  resourceCapacity: many(resourceCapacity),
  timeEntries: many(timeEntries),
  expenses: many(expenses),
  dashboardWidgets: many(dashboardWidgets),
  createdTemplates: many(projectTemplates),
  notifications: many(notifications),
  stakeholderProjects: many(projectStakeholders),
}));

export const projectStakeholdersRelations = relations(projectStakeholders, ({ one }) => ({
  project: one(projects, { fields: [projectStakeholders.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectStakeholders.userId], references: [users.id] }),
  addedByUser: one(users, { fields: [projectStakeholders.addedBy], references: [users.id] }),
}));

// ============= INSERT SCHEMAS =============

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  startDate: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val).optional(),
  endDate: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val).optional(),
});

export const insertSprintSchema = createInsertSchema(sprints).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  startDate: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val),
  endDate: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  startDate: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val).optional(),
  dueDate: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val).optional(),
  recurrenceEndDate: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val).optional(),
  estimatedHours: z.union([z.string(), z.number()]).transform(val => typeof val === 'number' ? val.toString() : val).optional(),
});
export const insertTaskHistorySchema = createInsertSchema(taskHistory).omit({ id: true, changedAt: true });
export const insertTaskDependencySchema = createInsertSchema(taskDependencies).omit({ id: true, createdAt: true });
export const insertCustomFieldSchema = createInsertSchema(customFields).omit({ id: true, createdAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFileAttachmentSchema = createInsertSchema(fileAttachments).omit({ id: true, createdAt: true });
export const insertRiskSchema = createInsertSchema(risks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBudgetItemSchema = createInsertSchema(budgetItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({ id: true, createdAt: true }).extend({
  date: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val),
});
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true }).extend({
  date: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val),
});
export const insertAutomationRuleSchema = createInsertSchema(automationRules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDashboardWidgetSchema = createInsertSchema(dashboardWidgets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectTemplateSchema = createInsertSchema(projectTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertKanbanColumnSchema = createInsertSchema(kanbanColumns).omit({ id: true, createdAt: true });
export const insertProjectStakeholderSchema = createInsertSchema(projectStakeholders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertTaskCustomFieldValueSchema = createInsertSchema(taskCustomFieldValues).omit({ id: true, createdAt: true });

// ============= TYPES =============

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertSprint = z.infer<typeof insertSprintSchema>;
export type Sprint = typeof sprints.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertTaskHistory = z.infer<typeof insertTaskHistorySchema>;
export type TaskHistory = typeof taskHistory.$inferSelect;

export type InsertTaskDependency = z.infer<typeof insertTaskDependencySchema>;
export type TaskDependency = typeof taskDependencies.$inferSelect;

export type InsertCustomField = z.infer<typeof insertCustomFieldSchema>;
export type CustomField = typeof customFields.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type InsertFileAttachment = z.infer<typeof insertFileAttachmentSchema>;
export type FileAttachment = typeof fileAttachments.$inferSelect;

export type InsertRisk = z.infer<typeof insertRiskSchema>;
export type Risk = typeof risks.$inferSelect;

export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;
export type BudgetItem = typeof budgetItems.$inferSelect;

export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type AutomationRule = typeof automationRules.$inferSelect;

export type InsertDashboardWidget = z.infer<typeof insertDashboardWidgetSchema>;
export type DashboardWidget = typeof dashboardWidgets.$inferSelect;

export type InsertProjectTemplate = z.infer<typeof insertProjectTemplateSchema>;
export type ProjectTemplate = typeof projectTemplates.$inferSelect;

export type InsertKanbanColumn = z.infer<typeof insertKanbanColumnSchema>;
export type KanbanColumn = typeof kanbanColumns.$inferSelect;

export type InsertProjectStakeholder = z.infer<typeof insertProjectStakeholderSchema>;
export type ProjectStakeholder = typeof projectStakeholders.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertTaskCustomFieldValue = z.infer<typeof insertTaskCustomFieldValueSchema>;
export type TaskCustomFieldValue = typeof taskCustomFieldValues.$inferSelect;
