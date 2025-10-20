/**
 * Status Report Email Template
 */

import {
  formatDate,
  truncateText,
  generateTimestampFooter,
  getStatusBadgeClass,
  getStatusDisplayLabel
} from '../template-utils';
import { wrapInHtmlDocument, baseStyles } from './shared-styles';

export interface StatusReportData {
  projectName: string;
  overallStatus?: string;
  progress?: number;
  accomplishments?: Array<{
    title: string;
    description?: string;
    assigneeName?: string;
    updatedAt?: string | Date;
  }>;
  upcoming?: Array<{
    title: string;
    description?: string;
    assigneeName?: string;
    priority?: string;
    dueDate?: string | Date;
    estimatedHours?: number;
    progress?: number;
  }>;
  risks?: Array<{
    title: string;
    description?: string;
  }>;
}

/**
 * Generate the current status section
 */
function generateCurrentStatusSection(data: StatusReportData): string {
  const statusClass = getStatusBadgeClass(data.overallStatus || '');
  const statusLabel = getStatusDisplayLabel(data.overallStatus || '');

  return `
    <div class="section">
      <h2>Current Status</h2>
      <p>
        <span class="status-badge ${statusClass}">
          ${statusLabel}
        </span>
      </p>
      <p><strong>Overall Progress:</strong> ${data.progress || 0}%</p>
    </div>
  `;
}

/**
 * Generate the recently completed tasks section
 */
function generateAccomplishmentsSection(data: StatusReportData): string {
  if (!data.accomplishments || data.accomplishments.length === 0) {
    return `
      <div class="section">
        <h2>Recently Completed Tasks</h2>
        <p style="color: #6b7280;">No tasks completed recently</p>
      </div>
    `;
  }

  const accomplishmentItems = data.accomplishments.map((task) => `
    <div class="task-item">
      <div class="task-header">
        <strong>${task.title || task}</strong>
        ${task.assigneeName ? `<span class="task-meta">by ${task.assigneeName}</span>` : ''}
      </div>
      ${task.description ? `<p style="margin: 4px 0; font-size: 14px; color: #4b5563;">${truncateText(task.description, 150)}</p>` : ''}
      ${task.updatedAt ? `<div class="task-meta">Completed: ${formatDate(task.updatedAt)}</div>` : ''}
    </div>
  `).join('');

  return `
    <div class="section">
      <h2>Recently Completed Tasks</h2>
      ${accomplishmentItems}
    </div>
  `;
}

/**
 * Generate the upcoming tasks section
 */
function generateUpcomingTasksSection(data: StatusReportData): string {
  if (!data.upcoming || data.upcoming.length === 0) {
    return `
      <div class="section">
        <h2>Upcoming Tasks</h2>
        <p style="color: #6b7280;">No upcoming tasks scheduled</p>
      </div>
    `;
  }

  const upcomingItems = data.upcoming.map((task) => {
    const priorityClass = (task.priority === 'critical' || task.priority === 'high') 
      ? `priority-${task.priority}` 
      : 'task-meta';

    return `
      <div class="task-item">
        <div class="task-header">
          <strong>${task.title || task}</strong>
          <span class="${priorityClass}">
            ${task.priority ? task.priority.toUpperCase() : ''}
          </span>
        </div>
        ${task.description ? `<p style="margin: 4px 0; font-size: 14px; color: #4b5563;">${truncateText(task.description, 150)}</p>` : ''}
        <div class="task-meta">
          ${task.assigneeName ? `Assigned to: ${task.assigneeName}` : 'Unassigned'} 
          ${task.dueDate ? ` | Due: ${formatDate(task.dueDate)}` : ''}
          ${task.estimatedHours ? ` | Est: ${task.estimatedHours}h` : ''}
        </div>
        ${task.progress && task.progress > 0 ? `<div class="task-meta">Progress: ${task.progress}%</div>` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="section">
      <h2>Upcoming Tasks</h2>
      ${upcomingItems}
    </div>
  `;
}

/**
 * Generate the risks and issues section
 */
function generateRisksSection(data: StatusReportData): string {
  if (!data.risks || data.risks.length === 0) {
    return '';
  }

  const riskItems = data.risks.map((risk) => 
    `<li><strong>${risk.title}:</strong> ${risk.description || ''}</li>`
  ).join('');

  return `
    <div class="section">
      <h2>Risks & Issues</h2>
      <ul>
        ${riskItems}
      </ul>
    </div>
  `;
}

/**
 * Generate the complete status report HTML
 */
export function generateStatusReportHTML(data: StatusReportData): string {
  if (!data) {
    return wrapInHtmlDocument(`
      <div class="error">
        <h1>Error Generating Report</h1>
        <p>Unable to generate status report due to missing data.</p>
      </div>
    `);
  }

  const content = `
    <div class="header">
      <h1>${data.projectName}</h1>
      <p>Status Report</p>
    </div>
    
    ${generateCurrentStatusSection(data)}
    ${generateAccomplishmentsSection(data)}
    ${generateUpcomingTasksSection(data)}
    ${generateRisksSection(data)}
    
    <div class="section">
      <p style="color: #6b7280; font-size: 12px;">
        ${generateTimestampFooter()}
      </p>
    </div>
  `;

  return wrapInHtmlDocument(content, baseStyles);
}