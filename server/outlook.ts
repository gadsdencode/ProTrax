import { Client } from '@microsoft/microsoft-graph-client';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=outlook',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token ?? connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Outlook not connected');
  }
  return accessToken;
}

export async function getUncachableOutlookClient() {
  const accessToken = await getAccessToken();

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => accessToken
    }
  });
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailParams {
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  subject: string;
  body: string;
  isHtml?: boolean;
}

export async function sendEmail(params: SendEmailParams) {
  const client = await getUncachableOutlookClient();
  
  const message = {
    subject: params.subject,
    body: {
      contentType: params.isHtml ? 'HTML' : 'Text',
      content: params.body
    },
    toRecipients: params.to.map(recipient => ({
      emailAddress: {
        address: recipient.email,
        name: recipient.name || recipient.email
      }
    })),
    ...(params.cc && params.cc.length > 0 ? {
      ccRecipients: params.cc.map(recipient => ({
        emailAddress: {
          address: recipient.email,
          name: recipient.name || recipient.email
        }
      }))
    } : {})
  };

  await client.api('/me/sendMail').post({
    message,
    saveToSentItems: true
  });
}

export async function sendProjectReport(
  projectName: string,
  reportType: string,
  reportData: any,
  recipients: EmailRecipient[]
) {
  console.log(`[EMAIL DEBUG] ========== SEND PROJECT REPORT START ==========`);
  console.log(`[EMAIL DEBUG] Project Name: ${projectName}`);
  console.log(`[EMAIL DEBUG] Report Type: ${reportType}`);
  console.log(`[EMAIL DEBUG] Recipients Count: ${recipients.length}`);
  console.log(`[EMAIL DEBUG] reportData type:`, typeof reportData);
  console.log(`[EMAIL DEBUG] reportData is array:`, Array.isArray(reportData));
  
  // Deep inspection of reportData structure
  if (typeof reportData === 'object' && !Array.isArray(reportData)) {
    console.log(`[EMAIL DEBUG] reportData keys:`, Object.keys(reportData));
    console.log(`[EMAIL DEBUG] reportData.tasks exists:`, 'tasks' in reportData);
    console.log(`[EMAIL DEBUG] reportData.tasks type:`, typeof reportData.tasks);
    console.log(`[EMAIL DEBUG] reportData.tasks is array:`, Array.isArray(reportData.tasks));
    console.log(`[EMAIL DEBUG] reportData.tasks length:`, reportData?.tasks?.length || 0);
    
    // Log first task if exists for verification
    if (reportData.tasks && reportData.tasks.length > 0) {
      console.log(`[EMAIL DEBUG] First task sample:`, JSON.stringify(reportData.tasks[0], null, 2));
    }
    
    // Log other important fields
    console.log(`[EMAIL DEBUG] reportData.totalTasks:`, reportData.totalTasks);
    console.log(`[EMAIL DEBUG] reportData.completedTasks:`, reportData.completedTasks);
    console.log(`[EMAIL DEBUG] reportData.inProgressTasks:`, reportData.inProgressTasks);
  }
  
  // Add validation before generating HTML
  if (!reportData) {
    throw new Error(`Report data is missing for ${reportType} report`);
  }

  // Validate data structure based on report type
  if (reportType === 'summary' || reportType === 'status') {
    if (typeof reportData !== 'object' || Array.isArray(reportData)) {
      throw new Error(`Invalid data structure for ${reportType} report: expected object, got ${Array.isArray(reportData) ? 'array' : typeof reportData}`);
    }
    
    // Require tasks array for summary/status reports
    if (!reportData.tasks) {
      // Log the issue for debugging
      console.error(`[ERROR] No tasks provided for ${reportType} report`);
      console.error(`[ERROR] Received data keys:`, Object.keys(reportData));
      console.error(`[ERROR] This likely indicates a data enrichment failure upstream`);
      
      // Throw error to prevent incomplete emails from being sent
      throw new Error(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report requires tasks data but none was provided. Please check data enrichment in routes.ts`);
    } else if (!Array.isArray(reportData.tasks)) {
      throw new Error(`Invalid tasks data for ${reportType} report: expected array, got ${typeof reportData.tasks}`);
    }
    
    // Warn if tasks array is empty (but allow it as this might be legitimate)
    if (reportData.tasks.length === 0) {
      console.warn(`[WARNING] ${reportType} report has empty tasks array - project may genuinely have no tasks`);
    }
  } else if (reportType === 'gantt' || reportType === 'kanban') {
    if (!Array.isArray(reportData)) {
      throw new Error(`Invalid data structure for ${reportType} report: expected array, got ${typeof reportData}`);
    }
  }
  
  let reportContent = '';
  
  if (reportType === 'summary') {
    console.log(`[EMAIL DEBUG] Generating summary HTML with data:`, {
      hasTasks: !!reportData.tasks,
      taskCount: reportData?.tasks?.length || 0,
      totalTasks: reportData.totalTasks,
      completedTasks: reportData.completedTasks
    });
    reportContent = generateProjectSummaryHTML(projectName, reportData);
  } else if (reportType === 'status') {
    console.log(`[EMAIL DEBUG] Generating status HTML with data:`, {
      hasTasks: !!reportData.tasks,
      taskCount: reportData?.tasks?.length || 0,
      accomplishments: reportData?.accomplishments?.length || 0,
      upcoming: reportData?.upcoming?.length || 0
    });
    reportContent = generateStatusReportHTML(projectName, reportData);
  } else if (reportType === 'gantt' || reportType === 'kanban') {
    console.log(`[EMAIL DEBUG] Generating ${reportType} HTML with task count:`, Array.isArray(reportData) ? reportData.length : 0);
    reportContent = generateTaskReportHTML(projectName, reportType, reportData);
  }
  
  console.log(`[EMAIL DEBUG] Generated HTML content length:`, reportContent.length);
  console.log(`[EMAIL DEBUG] HTML contains 'Task Details':`, reportContent.includes('Task Details'));
  console.log(`[EMAIL DEBUG] HTML contains '<table>':`, reportContent.includes('<table>'));
  console.log(`[EMAIL DEBUG] ========== SEND PROJECT REPORT END ==========`);

  await sendEmail({
    to: recipients,
    subject: `${projectName} - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
    body: reportContent,
    isHtml: true
  });
}

export async function sendPortfolioSummary(
  projectsData: any[],
  recipients: EmailRecipient[]
) {
  console.log(`[PORTFOLIO EMAIL DEBUG] ========== SEND PORTFOLIO SUMMARY START ==========`);
  console.log(`[PORTFOLIO EMAIL DEBUG] Projects count:`, projectsData.length);
  console.log(`[PORTFOLIO EMAIL DEBUG] Recipients count:`, recipients.length);
  
  // Validate projectsData
  if (!projectsData || !Array.isArray(projectsData) || projectsData.length === 0) {
    throw new Error('Portfolio summary requires at least one project');
  }
  
  // Log and validate task information for each project
  projectsData.forEach((project, index) => {
    console.log(`[PORTFOLIO EMAIL DEBUG] Project ${index + 1} ("${project.name}"):`);
    console.log(`  - Has tasks array:`, !!project.tasks);
    console.log(`  - Tasks is array:`, Array.isArray(project.tasks));
    console.log(`  - Task count:`, project.tasks?.length || 0);
    console.log(`  - Total tasks (calculated):`, project.totalTasks);
    
    // Validate each project has tasks array - fail fast if missing
    if (!project.tasks) {
      throw new Error(`Portfolio summary error: Project "${project.name}" is missing task data. Task information is required for all projects in the portfolio.`);
    }
    
    // Log first task if available
    if (project.tasks && project.tasks.length > 0) {
      console.log(`  - First task:`, {
        title: project.tasks[0].title,
        status: project.tasks[0].status,
        assignee: project.tasks[0].assigneeName
      });
    }
  });
  
  // Count total tasks across all projects
  const totalTasksAcrossPortfolio = projectsData.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
  console.log(`[PORTFOLIO EMAIL DEBUG] Total tasks across all projects:`, totalTasksAcrossPortfolio);
  
  if (totalTasksAcrossPortfolio === 0) {
    console.warn(`[WARNING] Portfolio has no tasks across any projects`);
  }
  
  const reportContent = generatePortfolioSummaryHTML(projectsData);
  console.log(`[PORTFOLIO EMAIL DEBUG] Generated HTML length:`, reportContent.length);
  console.log(`[PORTFOLIO EMAIL DEBUG] HTML contains task tables:`, reportContent.includes('<th>Task</th>'));
  console.log(`[PORTFOLIO EMAIL DEBUG] ========== SEND PORTFOLIO SUMMARY END ==========`);

  await sendEmail({
    to: recipients,
    subject: 'Portfolio Summary - All Active Projects',
    body: reportContent,
    isHtml: true
  });
}

function generateProjectSummaryHTML(projectName: string, data: any): string {
  console.log(`[HTML DEBUG] Generating Project Summary HTML`);
  
  // Handle null/undefined data gracefully
  if (!data) {
    console.error(`[ERROR] generateProjectSummaryHTML received null/undefined data`);
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; padding: 20px; }
          .error { background: #fee2e2; color: #991b1b; padding: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>Error Generating Report</h1>
          <p>Unable to generate project summary report due to missing data.</p>
        </div>
      </body>
      </html>
    `;
  }
  
  console.log(`[HTML DEBUG] Data keys:`, Object.keys(data));
  console.log(`[HTML DEBUG] Tasks available:`, !!data.tasks);
  console.log(`[HTML DEBUG] Tasks count:`, data.tasks?.length || 0);
  
  const formatStatus = (status: string) => {
    const statusMap: any = {
      'todo': 'To Do',
      'in_progress': 'In Progress', 
      'done': 'Completed',
      'blocked': 'Blocked'
    };
    return statusMap[status] || status;
  };
  
  const formatPriority = (priority: string) => {
    const priorityColors: any = {
      'critical': '#dc2626',
      'high': '#ea580c',
      'medium': '#3B82F6',
      'low': '#10b981'
    };
    return `<span style="color: ${priorityColors[priority] || '#6b7280'}; font-weight: 600;">${priority ? priority.toUpperCase() : 'N/A'}</span>`;
  };
  
  // Create tasks section HTML
  let tasksSection = '';
  if (data.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
    console.log(`[HTML DEBUG] Creating tasks table with ${data.tasks.length} tasks`);
    const tasksToShow = data.tasks.slice(0, 15);
    tasksSection = `
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
            ${tasksToShow.map((task: any) => `
              <tr>
                <td>
                  <strong>${task.title || 'Untitled Task'}</strong>
                  ${task.description ? `<div class="task-description">${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}</div>` : ''}
                </td>
                <td>${task.assigneeName || 'Unassigned'}</td>
                <td>${formatStatus(task.status || 'todo')}</td>
                <td>${formatPriority(task.priority || 'medium')}</td>
                <td>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${task.progress || 0}%;"></div>
                  </div>
                  <span style="margin-left: 8px; font-size: 12px;">${task.progress || 0}%</span>
                </td>
                <td>${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                <td>${task.estimatedHours || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    console.log(`[HTML DEBUG] No tasks available, adding message`);
    tasksSection = `
      <div class="section">
        <h2>Task Details</h2>
        <p style="color: #6b7280; font-style: italic;">No tasks available for this project.</p>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #3B82F6; color: white; padding: 20px; border-radius: 8px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
        .metric-value { font-size: 24px; font-weight: bold; color: #3B82F6; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f3f4f6; font-weight: 600; }
        .task-description { font-size: 12px; color: #6b7280; margin-top: 4px; }
        .progress-bar { background: #e5e7eb; border-radius: 4px; height: 6px; width: 60px; display: inline-block; }
        .progress-fill { background: #3B82F6; height: 100%; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${projectName}</h1>
        <p>Project Summary Report</p>
      </div>
      
      <div class="section">
        <h2>Project Overview</h2>
        <p><strong>Description:</strong> ${data.description || 'N/A'}</p>
        <p><strong>Status:</strong> ${data.status || 'N/A'}</p>
        <p><strong>Manager:</strong> ${data.manager || 'N/A'}</p>
        <p><strong>Start Date:</strong> ${data.startDate ? new Date(data.startDate).toLocaleDateString() : 'N/A'}</p>
        <p><strong>End Date:</strong> ${data.endDate ? new Date(data.endDate).toLocaleDateString() : 'N/A'}</p>
      </div>

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

      ${tasksSection}

      <div class="section">
        <p style="color: #6b7280; font-size: 12px;">
          Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </p>
      </div>
    </body>
    </html>
  `;
}

function generateStatusReportHTML(projectName: string, data: any): string {
  console.log(`[HTML DEBUG] Generating Status Report HTML`);
  
  // Handle null/undefined data gracefully
  if (!data) {
    console.error(`[ERROR] generateStatusReportHTML received null/undefined data`);
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; padding: 20px; }
          .error { background: #fee2e2; color: #991b1b; padding: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>Error Generating Report</h1>
          <p>Unable to generate status report due to missing data.</p>
        </div>
      </body>
      </html>
    `;
  }
  
  console.log(`[HTML DEBUG] Data keys:`, Object.keys(data));
  console.log(`[HTML DEBUG] Tasks available:`, !!data.tasks);
  console.log(`[HTML DEBUG] Tasks count:`, data.tasks?.length || 0);
  console.log(`[HTML DEBUG] Accomplishments count:`, data.accomplishments?.length || 0);
  console.log(`[HTML DEBUG] Upcoming tasks count:`, data.upcoming?.length || 0);
  
  const formatStatus = (status: string) => {
    const statusMap: any = {
      'todo': 'To Do',
      'in_progress': 'In Progress', 
      'done': 'Completed',
      'blocked': 'Blocked'
    };
    return statusMap[status] || status;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #3B82F6; color: white; padding: 20px; border-radius: 8px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .status-on-track { background: #dcfce7; color: #166534; }
        .status-at-risk { background: #fef3c7; color: #92400e; }
        .status-delayed { background: #fee2e2; color: #991b1b; }
        .task-item { margin-bottom: 12px; padding: 10px; background: #f9fafb; border-radius: 6px; }
        .task-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .task-meta { font-size: 12px; color: #6b7280; }
        .priority-high { color: #ea580c; font-weight: 600; }
        .priority-critical { color: #dc2626; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${projectName}</h1>
        <p>Status Report</p>
      </div>
      
      <div class="section">
        <h2>Current Status</h2>
        <p>
          <span class="status-badge ${data.overallStatus === 'on_track' ? 'status-on-track' : data.overallStatus === 'at_risk' ? 'status-at-risk' : 'status-delayed'}">
            ${data.overallStatus === 'on_track' ? 'On Track' : data.overallStatus === 'at_risk' ? 'At Risk' : 'Delayed'}
          </span>
        </p>
        <p><strong>Overall Progress:</strong> ${data.progress || 0}%</p>
      </div>

      <div class="section">
        <h2>Recently Completed Tasks</h2>
        ${data.accomplishments && data.accomplishments.length > 0 
          ? data.accomplishments.map((task: any) => `
            <div class="task-item">
              <div class="task-header">
                <strong>${task.title || task}</strong>
                ${task.assigneeName ? `<span class="task-meta">by ${task.assigneeName}</span>` : ''}
              </div>
              ${task.description ? `<p style="margin: 4px 0; font-size: 14px; color: #4b5563;">${task.description.substring(0, 150)}${task.description.length > 150 ? '...' : ''}</p>` : ''}
              ${task.updatedAt ? `<div class="task-meta">Completed: ${new Date(task.updatedAt).toLocaleDateString()}</div>` : ''}
            </div>
          `).join('') 
          : '<p style="color: #6b7280;">No tasks completed recently</p>'}
      </div>

      <div class="section">
        <h2>Upcoming Tasks</h2>
        ${data.upcoming && data.upcoming.length > 0 
          ? data.upcoming.map((task: any) => `
            <div class="task-item">
              <div class="task-header">
                <strong>${task.title || task}</strong>
                <span class="${task.priority === 'critical' || task.priority === 'high' ? `priority-${task.priority}` : 'task-meta'}">
                  ${task.priority ? task.priority.toUpperCase() : ''}
                </span>
              </div>
              ${task.description ? `<p style="margin: 4px 0; font-size: 14px; color: #4b5563;">${task.description.substring(0, 150)}${task.description.length > 150 ? '...' : ''}</p>` : ''}
              <div class="task-meta">
                ${task.assigneeName ? `Assigned to: ${task.assigneeName}` : 'Unassigned'} 
                ${task.dueDate ? ` | Due: ${new Date(task.dueDate).toLocaleDateString()}` : ''}
                ${task.estimatedHours ? ` | Est: ${task.estimatedHours}h` : ''}
              </div>
              ${task.progress > 0 ? `<div class="task-meta">Progress: ${task.progress}%</div>` : ''}
            </div>
          `).join('') 
          : '<p style="color: #6b7280;">No upcoming tasks scheduled</p>'}
      </div>

      ${data.risks && data.risks.length > 0 ? `
        <div class="section">
          <h2>Risks & Issues</h2>
          <ul>
            ${data.risks.map((risk: any) => `<li><strong>${risk.title}:</strong> ${risk.description || ''}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="section">
        <p style="color: #6b7280; font-size: 12px;">
          Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </p>
      </div>
    </body>
    </html>
  `;
}

function generateTaskReportHTML(projectName: string, reportType: string, tasks: any[]): string {
  const formatStatus = (status: string) => {
    const statusMap: any = {
      'todo': 'To Do',
      'in_progress': 'In Progress', 
      'done': 'Completed',
      'blocked': 'Blocked'
    };
    const statusColors: any = {
      'todo': '#6b7280',
      'in_progress': '#3B82F6',
      'done': '#10b981',
      'blocked': '#ef4444'
    };
    return `<span style="color: ${statusColors[status] || '#6b7280'}; font-weight: 600;">${statusMap[status] || status}</span>`;
  };
  
  const formatPriority = (priority: string) => {
    const priorityColors: any = {
      'critical': '#dc2626',
      'high': '#ea580c',
      'medium': '#3B82F6',
      'low': '#10b981'
    };
    return `<span style="color: ${priorityColors[priority] || '#6b7280'}; font-weight: 600;">${priority ? priority.toUpperCase() : 'N/A'}</span>`;
  };

  // Group tasks by status for Kanban view
  const groupedByStatus = reportType === 'kanban' ? {
    'To Do': tasks.filter(t => t.status === 'todo'),
    'In Progress': tasks.filter(t => t.status === 'in_progress'),
    'Done': tasks.filter(t => t.status === 'done'),
    'Blocked': tasks.filter(t => t.status === 'blocked')
  } : null;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #3B82F6; color: white; padding: 20px; border-radius: 8px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .summary-item { background: #f9fafb; padding: 12px; border-radius: 6px; }
        .summary-label { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; }
        .summary-value { font-size: 20px; font-weight: bold; color: #3B82F6; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f3f4f6; font-weight: 600; font-size: 13px; }
        td { font-size: 14px; }
        .task-description { font-size: 12px; color: #6b7280; margin-top: 4px; }
        .progress-bar { background: #e5e7eb; border-radius: 4px; height: 6px; width: 60px; display: inline-block; }
        .progress-fill { background: #3B82F6; height: 100%; border-radius: 4px; }
        .kanban-column { margin-bottom: 20px; }
        .kanban-header { background: #f3f4f6; padding: 10px; border-radius: 6px 6px 0 0; font-weight: 600; }
        .kanban-task { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 10px; }
        .milestone-marker { color: #9333ea; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${projectName}</h1>
        <p>${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</p>
      </div>
      
      <div class="section">
        <h2>Task Summary</h2>
        <div class="summary">
          <div class="summary-item">
            <div class="summary-label">Total Tasks</div>
            <div class="summary-value">${tasks.length}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Completed</div>
            <div class="summary-value">${tasks.filter(t => t.status === 'done').length}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">In Progress</div>
            <div class="summary-value">${tasks.filter(t => t.status === 'in_progress').length}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Blocked</div>
            <div class="summary-value">${tasks.filter(t => t.status === 'blocked').length}</div>
          </div>
        </div>

        ${reportType === 'kanban' && groupedByStatus ? `
          <h2>Tasks by Status</h2>
          ${Object.entries(groupedByStatus).map(([status, statusTasks]: [string, any]) => `
            <div class="kanban-column">
              <div class="kanban-header">${status} (${statusTasks.length})</div>
              ${statusTasks.length > 0 ? statusTasks.slice(0, 10).map((task: any) => `
                <div class="kanban-task">
                  <strong>${task.title}</strong>
                  ${task.isMilestone ? '<span class="milestone-marker"> [Milestone]</span>' : ''}
                  ${task.description ? `<div class="task-description">${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}</div>` : ''}
                  <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
                    ${task.assigneeName || 'Unassigned'} 
                    ${task.priority ? ` | ${formatPriority(task.priority)}` : ''}
                    ${task.dueDate ? ` | Due: ${new Date(task.dueDate).toLocaleDateString()}` : ''}
                  </div>
                </div>
              `).join('') : '<p style="color: #6b7280; font-style: italic; padding: 10px;">No tasks</p>'}
              ${statusTasks.length > 10 ? `<p style="font-size: 12px; color: #6b7280; text-align: center;">...and ${statusTasks.length - 10} more</p>` : ''}
            </div>
          `).join('')}
        ` : `
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
              ${tasks.slice(0, 50).map((task: any) => `
                <tr>
                  <td>
                    <strong>${task.title}</strong>
                    ${task.isMilestone ? '<span class="milestone-marker"> [M]</span>' : ''}
                    ${task.description ? `<div class="task-description">${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}</div>` : ''}
                  </td>
                  <td>${task.assigneeName || 'Unassigned'}</td>
                  <td>${formatStatus(task.status || 'todo')}</td>
                  <td>${formatPriority(task.priority || 'medium')}</td>
                  <td>
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${task.progress || 0}%;"></div>
                    </div>
                    <span style="margin-left: 8px; font-size: 12px;">${task.progress || 0}%</span>
                  </td>
                  <td>${task.startDate ? new Date(task.startDate).toLocaleDateString() : '-'}</td>
                  <td>${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</td>
                  <td>${task.estimatedHours || '-'}</td>
                  ${reportType === 'gantt' ? `<td>${task.duration ? `${task.duration}h` : '-'}</td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${tasks.length > 50 ? `<p style="text-align: center; color: #6b7280; font-size: 12px;">Showing 50 of ${tasks.length} tasks</p>` : ''}
        `}
      </div>

      <div class="section">
        <p style="color: #6b7280; font-size: 12px;">
          Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
          <br>Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}
        </p>
      </div>
    </body>
    </html>
  `;
}

function generatePortfolioSummaryHTML(projectsData: any[]): string {
  console.log(`[HTML DEBUG] Generating Portfolio Summary HTML`);
  
  // Handle null/undefined data gracefully
  if (!projectsData || !Array.isArray(projectsData)) {
    console.error(`[ERROR] generatePortfolioSummaryHTML received invalid data`);
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; padding: 20px; }
          .error { background: #fee2e2; color: #991b1b; padding: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>Error Generating Report</h1>
          <p>Unable to generate portfolio summary due to missing or invalid data.</p>
        </div>
      </body>
      </html>
    `;
  }
  
  console.log(`[HTML DEBUG] Projects count:`, projectsData.length);
  
  projectsData.forEach((project, index) => {
    console.log(`[HTML DEBUG] Project ${index + 1}:`, {
      name: project.name,
      hasTasks: !!project.tasks,
      taskCount: project.tasks?.length || 0,
      totalTasks: project.totalTasks,
      completedTasks: project.completedTasks
    });
  });
  
  const totalBudget = projectsData.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0);
  const totalTasks = projectsData.reduce((sum, p) => sum + p.totalTasks, 0);
  const totalCompleted = projectsData.reduce((sum, p) => sum + p.completedTasks, 0);
  const overallProgress = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #3B82F6; color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
        .summary-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
        .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; }
        .stat-value { font-size: 32px; font-weight: bold; color: #3B82F6; }
        .project-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .project-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; }
        .project-name { font-size: 20px; font-weight: 600; color: #111827; margin: 0; }
        .project-status { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #dcfce7; color: #166534; }
        .project-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 15px; }
        .metric { }
        .metric-label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
        .metric-value { font-size: 18px; font-weight: 600; color: #3B82F6; }
        .progress-bar { background: #e5e7eb; border-radius: 4px; height: 8px; margin-top: 10px; overflow: hidden; }
        .progress-fill { background: #3B82F6; height: 100%; transition: width 0.3s; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0 0 10px 0;">Portfolio Summary</h1>
        <p style="margin: 0; opacity: 0.9;">Active Projects Overview</p>
      </div>

      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-label">Active Projects</div>
          <div class="stat-value">${projectsData.length}</div>
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

      <h2 style="margin-top: 40px; margin-bottom: 20px;">Project Details</h2>

      ${projectsData.map(project => `
        <div class="project-card">
          <div class="project-header">
            <div>
              <h3 class="project-name">${project.name}</h3>
              <p style="color: #6b7280; margin: 5px 0;">${project.description || 'No description'}</p>
              ${project.manager ? `<p style="color: #6b7280; margin: 5px 0; font-size: 12px;"><strong>Manager:</strong> ${project.manager}</p>` : ''}
            </div>
            <span class="project-status">${project.status}</span>
          </div>

          <div class="project-metrics">
            <div class="metric">
              <div class="metric-label">Budget</div>
              <div class="metric-value">$${parseFloat(project.budget || 0).toLocaleString()}</div>
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

          ${project.startDate || project.endDate ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
              <span style="font-size: 12px; color: #6b7280;">
                ${project.startDate ? `Start: ${new Date(project.startDate).toLocaleDateString()}` : ''}
                ${project.startDate && project.endDate ? ' | ' : ''}
                ${project.endDate ? `End: ${new Date(project.endDate).toLocaleDateString()}` : ''}
              </span>
            </div>
          ` : ''}

          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <h4 style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 10px;">Tasks</h4>
            ${project.tasks && project.tasks.length > 0 ? `
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
                    ${project.tasks.slice(0, 10).map((task: any) => {
                      const statusColors: any = {
                        'todo': '#6b7280',
                        'in_progress': '#3B82F6',
                        'done': '#10b981',
                        'blocked': '#ef4444'
                      };
                      const statusLabels: any = {
                        'todo': 'To Do',
                        'in_progress': 'In Progress',
                        'done': 'Done',
                        'blocked': 'Blocked'
                      };
                      return `
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                          <td style="padding: 8px;">
                            <div style="font-weight: 500; color: #111827;">${task.title}</div>
                            ${task.description ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${task.description.slice(0, 60)}${task.description.length > 60 ? '...' : ''}</div>` : ''}
                          </td>
                          <td style="padding: 8px; color: #374151;">${task.assigneeName || 'Unassigned'}</td>
                          <td style="padding: 8px;">
                            <span style="color: ${statusColors[task.status] || '#6b7280'}; font-weight: 600;">
                              ${statusLabels[task.status] || task.status}
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
                    }).join('')}
                  </tbody>
                </table>
                ${project.tasks.length > 10 ? `
                  <p style="text-align: center; color: #6b7280; font-size: 11px; margin-top: 8px;">
                    Showing 10 of ${project.tasks.length} tasks
                  </p>
                ` : ''}
              </div>
            ` : `
              <p style="color: #6b7280; font-size: 13px; padding: 20px; text-align: center; background: #f9fafb; border-radius: 6px;">
                No tasks found for this project
              </p>
            `}
          </div>
        </div>
      `).join('')}

      <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        <p style="margin-top: 5px;">This report includes all currently active projects in the portfolio.</p>
      </div>
    </body>
    </html>
  `;
}
