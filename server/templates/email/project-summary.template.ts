/**
 * Project Summary Email Template
 */

import {
  formatDate,
  formatStatus,
  formatPriorityWithColor,
  createProgressBar,
  truncateText,
  generateTimestampFooter
} from '../template-utils';
import { wrapInHtmlDocument, baseStyles } from './shared-styles';

export interface ProjectSummaryData {
  projectName: string;
  description?: string;
  status?: string;
  manager?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  totalTasks?: number;
  completedTasks?: number;
  inProgressTasks?: number;
  budget?: number;
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
  return `
    <div class="section">
      <h2>Project Overview</h2>
      <p><strong>Description:</strong> ${data.description || 'N/A'}</p>
      <p><strong>Status:</strong> ${data.status || 'N/A'}</p>
      <p><strong>Manager:</strong> ${data.manager || 'N/A'}</p>
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
        <div class="metric-value">$${data.budget || 0}</div>
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