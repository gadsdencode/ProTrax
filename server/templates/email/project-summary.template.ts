/**
 * Project Summary Email Template
 */

import {
  formatDate,
  formatStatus,
  formatProjectStatus,
  formatPriorityWithColor,
  createProgressBar,
  truncateText,
  generateTimestampFooter
} from '../template-utils';
import { wrapInHtmlDocument, baseStyles } from './shared-styles';
import { debugLogTagged } from '../../utils/debug';

export interface ProjectSummaryData {
  projectName: string;
  description?: string | null;
  status?: string | null;
  manager?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  totalTasks?: number;
  completedTasks?: number;
  inProgressTasks?: number;
  budget?: number | string | null;
  tasks?: Array<{
    title: string;
    description?: string;
    assigneeName?: string;
    status?: string;
    priority?: string;
    progress?: number;
    dueDate?: string | Date;
    estimatedHours?: number;
  }>;
}

/**
 * Generate the project overview section
 */
function generateProjectOverviewSection(data: ProjectSummaryData): string {
  // Ensure we have valid data to display
  const description = data.description && data.description.trim() ? data.description : 'No description provided';
  const status = formatProjectStatus(data.status);
  const manager = data.manager && data.manager.trim() ? data.manager : 'N/A';
  
  return `
    <div class="section">
      <h2>Project Overview</h2>
      <p><strong>Description:</strong> ${description}</p>
      <p><strong>Status:</strong> ${status}</p>
      <p><strong>Manager:</strong> ${manager}</p>
      <p><strong>Start Date:</strong> ${formatDate(data.startDate)}</p>
      <p><strong>End Date:</strong> ${formatDate(data.endDate)}</p>
    </div>
  `;
}

/**
 * Generate the key metrics section
 */
function generateMetricsSection(data: ProjectSummaryData): string {
  return `
    <div class="section">
      <h2>Key Metrics</h2>
      <div class="metric">
        <div class="metric-label">Total Tasks</div>
        <div class="metric-value">${data.totalTasks || 0}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Completed</div>
        <div class="metric-value">${data.completedTasks || 0}</div>
      </div>
      <div class="metric">
        <div class="metric-label">In Progress</div>
        <div class="metric-value">${data.inProgressTasks || 0}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Budget</div>
        <div class="metric-value">$${data.budget ? (typeof data.budget === 'string' ? parseFloat(data.budget).toLocaleString() : data.budget.toLocaleString()) : '0'}</div>
      </div>
    </div>
  `;
}

/**
 * Generate the tasks section
 */
function generateTasksSection(data: ProjectSummaryData): string {
  if (!data.tasks || !Array.isArray(data.tasks) || data.tasks.length === 0) {
    return `
      <div class="section">
        <h2>Task Details</h2>
        <p style="color: #6b7280; font-style: italic;">No tasks available for this project.</p>
      </div>
    `;
  }

  const tasksToShow = data.tasks.slice(0, 15);
  const taskRows = tasksToShow.map((task) => `
    <tr>
      <td>
        <strong>${task.title || 'Untitled Task'}</strong>
        ${task.description ? `<div class="task-description">${truncateText(task.description, 100)}</div>` : ''}
      </td>
      <td>${task.assigneeName || 'Unassigned'}</td>
      <td>${formatStatus(task.status || 'todo')}</td>
      <td>${formatPriorityWithColor(task.priority)}</td>
      <td>${createProgressBar(task.progress)}</td>
      <td>${formatDate(task.dueDate)}</td>
      <td>${task.estimatedHours || '-'}</td>
    </tr>
  `).join('');

  return `
    <div class="section">
      <h2>Task Details (Latest ${Math.min(15, data.tasks.length)} of ${data.tasks.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Assignee</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Progress</th>
            <th>Due Date</th>
            <th>Est. Hours</th>
          </tr>
        </thead>
        <tbody>
          ${taskRows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generate the complete project summary HTML
 */
export function generateProjectSummaryHTML(data: ProjectSummaryData): string {
  if (!data) {
    return wrapInHtmlDocument(`
      <div class="error">
        <h1>Error Generating Report</h1>
        <p>Unable to generate project summary report due to missing data.</p>
      </div>
    `);
  }

  // Debug logging to identify data issues (development only)
  debugLogTagged('TEMPLATE DEBUG', 'Project Summary Data received:', {
    projectName: data.projectName,
    hasDescription: !!data.description,
    description: data.description,
    hasStatus: !!data.status,
    status: data.status,
    hasManager: !!data.manager,
    manager: data.manager,
    hasStartDate: !!data.startDate,
    startDate: data.startDate,
    hasEndDate: !!data.endDate,
    endDate: data.endDate,
    hasBudget: !!data.budget,
    budget: data.budget,
    budgetType: typeof data.budget,
    totalTasks: data.totalTasks,
    completedTasks: data.completedTasks,
    taskCount: data.tasks?.length || 0
  });

  const content = `
    <div class="header">
      <h1>${data.projectName}</h1>
      <p>Project Summary Report</p>
    </div>
    
    ${generateProjectOverviewSection(data)}
    ${generateMetricsSection(data)}
    ${generateTasksSection(data)}
    
    <div class="section">
      <p style="color: #6b7280; font-size: 12px;">
        ${generateTimestampFooter()}
      </p>
    </div>
  `;

  return wrapInHtmlDocument(content, baseStyles);
}