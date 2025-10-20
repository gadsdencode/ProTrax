/**
 * Task Report Email Template (Gantt/Kanban)
 */

import {
  formatDate,
  formatStatusWithColor,
  formatPriorityWithColor,
  createProgressBar,
  truncateText,
  generateTimestampFooter
} from '../template-utils';
import { wrapInHtmlDocument, kanbanStyles } from './shared-styles';

export interface TaskReportData {
  projectName: string;
  reportType: 'gantt' | 'kanban';
  tasks: Array<{
    title: string;
    description?: string;
    assigneeName?: string;
    status?: string;
    priority?: string;
    progress?: number;
    startDate?: string | Date;
    dueDate?: string | Date;
    estimatedHours?: number;
    duration?: number;
    isMilestone?: boolean;
  }>;
}

/**
 * Generate the task summary section
 */
function generateTaskSummary(tasks: TaskReportData['tasks']): string {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;

  return `
    <div class="section">
      <h2>Task Summary</h2>
      <div class="summary">
        <div class="summary-item">
          <div class="summary-label">Total Tasks</div>
          <div class="summary-value">${total}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Completed</div>
          <div class="summary-value">${completed}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">In Progress</div>
          <div class="summary-value">${inProgress}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Blocked</div>
          <div class="summary-value">${blocked}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate Kanban view of tasks
 */
function generateKanbanView(tasks: TaskReportData['tasks']): string {
  const groupedByStatus = {
    'To Do': tasks.filter(t => t.status === 'todo'),
    'In Progress': tasks.filter(t => t.status === 'in_progress'),
    'Done': tasks.filter(t => t.status === 'done'),
    'Blocked': tasks.filter(t => t.status === 'blocked')
  };

  const statusColumns = Object.entries(groupedByStatus).map(([status, statusTasks]) => {
    if (statusTasks.length === 0) {
      return `
        <div class="kanban-column">
          <div class="kanban-header">${status} (0)</div>
          <p style="color: #6b7280; font-style: italic; padding: 10px;">No tasks</p>
        </div>
      `;
    }

    const tasksToShow = statusTasks.slice(0, 10);
    const taskCards = tasksToShow.map((task) => `
      <div class="kanban-task">
        <strong>${task.title}</strong>
        ${task.isMilestone ? '<span class="milestone-marker"> [Milestone]</span>' : ''}
        ${task.description ? `<div class="task-description">${truncateText(task.description, 100)}</div>` : ''}
        <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
          ${task.assigneeName || 'Unassigned'} 
          ${task.priority ? ` | ${formatPriorityWithColor(task.priority)}` : ''}
          ${task.dueDate ? ` | Due: ${formatDate(task.dueDate)}` : ''}
        </div>
      </div>
    `).join('');

    const moreTasksNote = statusTasks.length > 10 
      ? `<p style="font-size: 12px; color: #6b7280; text-align: center;">...and ${statusTasks.length - 10} more</p>` 
      : '';

    return `
      <div class="kanban-column">
        <div class="kanban-header">${status} (${statusTasks.length})</div>
        ${taskCards}
        ${moreTasksNote}
      </div>
    `;
  }).join('');

  return `
    <h2>Tasks by Status</h2>
    ${statusColumns}
  `;
}

/**
 * Generate Gantt/Table view of tasks
 */
function generateTableView(tasks: TaskReportData['tasks'], reportType: string): string {
  const tasksToShow = tasks.slice(0, 50);
  
  const taskRows = tasksToShow.map((task) => `
    <tr>
      <td>
        <strong>${task.title}</strong>
        ${task.isMilestone ? '<span class="milestone-marker"> [M]</span>' : ''}
        ${task.description ? `<div class="task-description">${truncateText(task.description, 100)}</div>` : ''}
      </td>
      <td>${task.assigneeName || 'Unassigned'}</td>
      <td>${formatStatusWithColor(task.status || 'todo')}</td>
      <td>${formatPriorityWithColor(task.priority)}</td>
      <td>${createProgressBar(task.progress)}</td>
      <td>${formatDate(task.startDate) || '-'}</td>
      <td>${formatDate(task.dueDate) || '-'}</td>
      <td>${task.estimatedHours || '-'}</td>
      ${reportType === 'gantt' ? `<td>${task.duration ? `${task.duration}h` : '-'}</td>` : ''}
    </tr>
  `).join('');

  const moreTasksNote = tasks.length > 50 
    ? `<p style="text-align: center; color: #6b7280; font-size: 12px;">Showing 50 of ${tasks.length} tasks</p>` 
    : '';

  return `
    <h2>Detailed Task List</h2>
    <table>
      <thead>
        <tr>
          <th>Task</th>
          <th>Assignee</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Progress</th>
          <th>Start Date</th>
          <th>Due Date</th>
          <th>Est. Hours</th>
          ${reportType === 'gantt' ? '<th>Duration</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${taskRows}
      </tbody>
    </table>
    ${moreTasksNote}
  `;
}

/**
 * Generate the complete task report HTML
 */
export function generateTaskReportHTML(data: TaskReportData): string {
  const { projectName, reportType, tasks } = data;
  
  const taskContent = reportType === 'kanban' 
    ? generateKanbanView(tasks)
    : generateTableView(tasks, reportType);

  const content = `
    <div class="header">
      <h1>${projectName}</h1>
      <p>${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</p>
    </div>
    
    ${generateTaskSummary(tasks)}
    
    <div class="section">
      ${taskContent}
    </div>
    
    <div class="section">
      <p style="color: #6b7280; font-size: 12px;">
        ${generateTimestampFooter()}
        <br>Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}
      </p>
    </div>
  `;

  return wrapInHtmlDocument(content, kanbanStyles);
}