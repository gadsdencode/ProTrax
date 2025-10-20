/**
 * Template utility functions for email generation
 */

export interface TemplateData {
  [key: string]: any;
}

/**
 * Renders a template string with data
 * Supports basic expressions like ${variable} and ${object.property}
 */
export function renderTemplate(template: string, data: TemplateData): string {
  // Replace template expressions with data values
  return template.replace(/\${([^}]+)}/g, (match, path) => {
    const keys = path.split('.');
    let value: any = data;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }
    
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Format date to a locale string
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString();
}

/**
 * Format time to a locale string
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleTimeString();
}

/**
 * Format status from internal representation to display format
 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'todo': 'To Do',
    'in_progress': 'In Progress',
    'done': 'Completed',
    'blocked': 'Blocked'
  };
  return statusMap[status] || status;
}

/**
 * Get status color for display
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    'todo': '#6b7280',
    'in_progress': '#3B82F6',
    'done': '#10b981',
    'blocked': '#ef4444'
  };
  return statusColors[status] || '#6b7280';
}

/**
 * Format priority with color
 */
export function formatPriorityWithColor(priority: string | null | undefined): string {
  if (!priority) {
    return '<span style="color: #6b7280; font-weight: 600;">N/A</span>';
  }
  
  const priorityColors: Record<string, string> = {
    'critical': '#dc2626',
    'high': '#ea580c',
    'medium': '#3B82F6',
    'low': '#10b981'
  };
  
  const color = priorityColors[priority] || '#6b7280';
  return `<span style="color: ${color}; font-weight: 600;">${priority.toUpperCase()}</span>`;
}

/**
 * Format status with color
 */
export function formatStatusWithColor(status: string): string {
  const color = getStatusColor(status);
  const label = formatStatus(status);
  return `<span style="color: ${color}; font-weight: 600;">${label}</span>`;
}

/**
 * Create progress bar HTML
 */
export function createProgressBar(progress: number = 0): string {
  return `
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${progress}%;"></div>
    </div>
    <span style="margin-left: 8px; font-size: 12px;">${progress}%</span>
  `;
}

/**
 * Truncate text to a specified length
 */
export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Generate current timestamp footer
 */
export function generateTimestampFooter(): string {
  const now = new Date();
  return `Generated on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
}

/**
 * Get status badge CSS class based on status
 */
export function getStatusBadgeClass(status: string): string {
  const statusClassMap: Record<string, string> = {
    'on_track': 'status-on-track',
    'at_risk': 'status-at-risk',
    'delayed': 'status-delayed'
  };
  return statusClassMap[status] || 'status-delayed';
}

/**
 * Get status display label
 */
export function getStatusDisplayLabel(status: string): string {
  const statusLabelMap: Record<string, string> = {
    'on_track': 'On Track',
    'at_risk': 'At Risk',
    'delayed': 'Delayed'
  };
  return statusLabelMap[status] || 'Unknown';
}