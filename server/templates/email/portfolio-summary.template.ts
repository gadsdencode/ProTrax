/**
 * Portfolio Summary Email Template
 */

import {
  formatDate,
  getStatusColor,
  formatStatus,
  truncateText,
  generateTimestampFooter
} from '../template-utils';
import { wrapInHtmlDocument, portfolioStyles } from './shared-styles';

export interface PortfolioProject {
  name: string;
  description?: string;
  status?: string;
  manager?: string;
  budget?: number | string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  progress: number;
  startDate?: string | Date;
  endDate?: string | Date;
  tasks?: Array<{
    title: string;
    description?: string;
    assigneeName?: string;
    status?: string;
    progress?: number;
  }>;
}

export interface PortfolioSummaryData {
  projects: PortfolioProject[];
}

/**
 * Generate portfolio statistics section
 */
function generatePortfolioStats(projects: PortfolioProject[]): string {
  const totalBudget = projects.reduce((sum, p) => sum + (parseFloat(String(p.budget || 0)) || 0), 0);
  const totalTasks = projects.reduce((sum, p) => sum + p.totalTasks, 0);
  const totalCompleted = projects.reduce((sum, p) => sum + p.completedTasks, 0);
  const overallProgress = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  return `
    <div class="summary-stats">
      <div class="stat-card">
        <div class="stat-label">Active Projects</div>
        <div class="stat-value">${projects.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Budget</div>
        <div class="stat-value">$${totalBudget.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Tasks</div>
        <div class="stat-value">${totalTasks}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Overall Progress</div>
        <div class="stat-value">${overallProgress}%</div>
      </div>
    </div>
  `;
}

/**
 * Generate project tasks table
 */
function generateProjectTasksTable(project: PortfolioProject): string {
  if (!project.tasks || project.tasks.length === 0) {
    return `
      <p style="color: #6b7280; font-size: 13px; padding: 20px; text-align: center; background: #f9fafb; border-radius: 6px;">
        No tasks found for this project
      </p>
    `;
  }

  const tasksToShow = project.tasks.slice(0, 10);
  const taskRows = tasksToShow.map((task) => {
    const statusColor = getStatusColor(task.status || 'todo');
    const statusLabel = formatStatus(task.status || 'todo');
    
    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px;">
          <div style="font-weight: 500; color: #111827;">${task.title}</div>
          ${task.description ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${truncateText(task.description, 60)}</div>` : ''}
        </td>
        <td style="padding: 8px; color: #374151;">${task.assigneeName || 'Unassigned'}</td>
        <td style="padding: 8px;">
          <span style="color: ${statusColor}; font-weight: 600;">
            ${statusLabel}
          </span>
        </td>
        <td style="padding: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="flex: 1; background: #e5e7eb; border-radius: 4px; height: 6px; overflow: hidden;">
              <div style="background: #3B82F6; height: 100%; width: ${task.progress || 0}%;"></div>
            </div>
            <span style="font-size: 11px; color: #6b7280; white-space: nowrap;">${task.progress || 0}%</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const moreTasksNote = project.tasks.length > 10 
    ? `<p style="text-align: center; color: #6b7280; font-size: 11px; margin-top: 8px;">
        Showing 10 of ${project.tasks.length} tasks
      </p>` 
    : '';

  return `
    <div style="max-height: 300px; overflow-y: auto;">
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background: #f9fafb; text-align: left;">
            <th style="padding: 8px; border-bottom: 2px solid #e5e7eb;">Task</th>
            <th style="padding: 8px; border-bottom: 2px solid #e5e7eb;">Assignee</th>
            <th style="padding: 8px; border-bottom: 2px solid #e5e7eb;">Status</th>
            <th style="padding: 8px; border-bottom: 2px solid #e5e7eb;">Progress</th>
          </tr>
        </thead>
        <tbody>
          ${taskRows}
        </tbody>
      </table>
      ${moreTasksNote}
    </div>
  `;
}

/**
 * Generate individual project card
 */
function generateProjectCard(project: PortfolioProject): string {
  const dateRange = (project.startDate || project.endDate) ? `
    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
      <span style="font-size: 12px; color: #6b7280;">
        ${project.startDate ? `Start: ${formatDate(project.startDate)}` : ''}
        ${project.startDate && project.endDate ? ' | ' : ''}
        ${project.endDate ? `End: ${formatDate(project.endDate)}` : ''}
      </span>
    </div>
  ` : '';

  return `
    <div class="project-card">
      <div class="project-header">
        <div>
          <h3 class="project-name">${project.name}</h3>
          <p style="color: #6b7280; margin: 5px 0;">${project.description || 'No description'}</p>
          ${project.manager ? `<p style="color: #6b7280; margin: 5px 0; font-size: 12px;"><strong>Manager:</strong> ${project.manager}</p>` : ''}
        </div>
        <span class="project-status">${project.status || 'Active'}</span>
      </div>

      <div class="project-metrics">
        <div class="metric">
          <div class="metric-label">Budget</div>
          <div class="metric-value">$${parseFloat(String(project.budget || 0)).toLocaleString()}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Total Tasks</div>
          <div class="metric-value">${project.totalTasks}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Completed</div>
          <div class="metric-value">${project.completedTasks}</div>
        </div>
        <div class="metric">
          <div class="metric-label">In Progress</div>
          <div class="metric-value">${project.inProgressTasks}</div>
        </div>
      </div>

      <div style="margin-top: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
          <span style="font-size: 12px; color: #6b7280;">Progress</span>
          <span style="font-size: 14px; font-weight: 600; color: #3B82F6;">${project.progress}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${project.progress}%;"></div>
        </div>
      </div>

      ${dateRange}

      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
        <h4 style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 10px;">Tasks</h4>
        ${generateProjectTasksTable(project)}
      </div>
    </div>
  `;
}

/**
 * Generate the complete portfolio summary HTML
 */
export function generatePortfolioSummaryHTML(data: PortfolioSummaryData): string {
  if (!data || !data.projects || !Array.isArray(data.projects)) {
    return wrapInHtmlDocument(`
      <div class="error">
        <h1>Error Generating Report</h1>
        <p>Unable to generate portfolio summary due to missing or invalid data.</p>
      </div>
    `, portfolioStyles);
  }

  const projectCards = data.projects.map(project => generateProjectCard(project)).join('');

  const content = `
    <div class="header">
      <h1 style="margin: 0 0 10px 0;">Portfolio Summary</h1>
      <p style="margin: 0; opacity: 0.9;">Active Projects Overview</p>
    </div>

    ${generatePortfolioStats(data.projects)}

    <h2 style="margin-top: 40px; margin-bottom: 20px;">Project Details</h2>

    ${projectCards}

    <div class="footer">
      <p>${generateTimestampFooter()}</p>
      <p style="margin-top: 5px;">This report includes all currently active projects in the portfolio.</p>
    </div>
  `;

  return wrapInHtmlDocument(content, portfolioStyles);
}