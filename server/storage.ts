/**
 * Storage Layer - Backward Compatibility Re-export
 * 
 * This file re-exports the modular storage system from ./storage/
 * to maintain backward compatibility with existing imports.
 * 
 * The storage layer has been refactored into domain-specific services:
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
 * 
 * All functionality is preserved; this is purely an architectural improvement
 * following the Single Responsibility Principle (SRP).
 */

// Re-export everything from the modular storage system
export * from "./storage/index";

// Default export for convenience
export { storage as default } from "./storage/index";
