import { Client } from '@microsoft/microsoft-graph-client';

// Import template functions
import { generateProjectSummaryHTML } from './templates/email/project-summary.template';
import { generateStatusReportHTML } from './templates/email/status-report.template';
import { generateTaskReportHTML } from './templates/email/task-report.template';
import { generatePortfolioSummaryHTML } from './templates/email/portfolio-summary.template';
import { debugLogTagged, log } from './utils/debug';

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
  // Always log important email operations
  log(`[EMAIL] Sending ${reportType} report for project: ${projectName} to ${recipients.length} recipient(s)`);
  
  // Verbose debug logging (development only)
  debugLogTagged('EMAIL DEBUG', '========== SEND PROJECT REPORT START ==========');
  debugLogTagged('EMAIL DEBUG', `Project Name: ${projectName}`);
  debugLogTagged('EMAIL DEBUG', `Report Type: ${reportType}`);
  debugLogTagged('EMAIL DEBUG', `Recipients Count: ${recipients.length}`);
  debugLogTagged('EMAIL DEBUG', `reportData type:`, typeof reportData);
  debugLogTagged('EMAIL DEBUG', `reportData is array:`, Array.isArray(reportData));
  
  // Deep inspection of reportData structure (development only)
  if (typeof reportData === 'object' && !Array.isArray(reportData)) {
    debugLogTagged('EMAIL DEBUG', `reportData keys:`, Object.keys(reportData));
    debugLogTagged('EMAIL DEBUG', `reportData.tasks exists:`, 'tasks' in reportData);
    debugLogTagged('EMAIL DEBUG', `reportData.tasks type:`, typeof reportData.tasks);
    debugLogTagged('EMAIL DEBUG', `reportData.tasks is array:`, Array.isArray(reportData.tasks));
    debugLogTagged('EMAIL DEBUG', `reportData.tasks length:`, reportData?.tasks?.length || 0);
    
    // Log first task if exists for verification
    if (reportData.tasks && reportData.tasks.length > 0) {
      debugLogTagged('EMAIL DEBUG', `First task sample:`, JSON.stringify(reportData.tasks[0], null, 2));
    }
    
    // Log other important fields
    debugLogTagged('EMAIL DEBUG', `reportData.totalTasks:`, reportData.totalTasks);
    debugLogTagged('EMAIL DEBUG', `reportData.completedTasks:`, reportData.completedTasks);
    debugLogTagged('EMAIL DEBUG', `reportData.inProgressTasks:`, reportData.inProgressTasks);
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
    debugLogTagged('EMAIL DEBUG', `Generating summary HTML with data:`, {
      hasTasks: !!reportData.tasks,
      taskCount: reportData?.tasks?.length || 0,
      totalTasks: reportData.totalTasks,
      completedTasks: reportData.completedTasks,
      hasDescription: !!reportData.description,
      description: reportData.description,
      hasStatus: !!reportData.status,
      status: reportData.status,
      hasManager: !!reportData.manager,
      manager: reportData.manager,
      hasStartDate: !!reportData.startDate,
      startDate: reportData.startDate,
      hasEndDate: !!reportData.endDate,
      endDate: reportData.endDate,
      hasBudget: !!reportData.budget,
      budget: reportData.budget,
      allKeys: Object.keys(reportData)
    });
    
    // Prepare data for template - ensure all fields are properly mapped
    const templateData = {
      projectName,
      description: reportData.description || null,
      status: reportData.status || null,
      manager: reportData.manager || null,
      startDate: reportData.startDate || null,
      endDate: reportData.endDate || null,
      budget: reportData.budget || null,
      totalTasks: reportData.totalTasks || 0,
      completedTasks: reportData.completedTasks || 0,
      inProgressTasks: reportData.inProgressTasks || 0,
      tasks: reportData.tasks || []
    };
    
    debugLogTagged('EMAIL DEBUG', `Template data prepared:`, {
      projectName: templateData.projectName,
      hasDescription: !!templateData.description,
      hasStatus: !!templateData.status,
      hasManager: !!templateData.manager,
      hasStartDate: !!templateData.startDate,
      hasEndDate: !!templateData.endDate,
      hasBudget: !!templateData.budget,
      taskCount: templateData.tasks.length
    });
    
    // Use the new template function
    reportContent = generateProjectSummaryHTML(templateData);
  } else if (reportType === 'status') {
    debugLogTagged('EMAIL DEBUG', `Generating status HTML with data:`, {
      hasTasks: !!reportData.tasks,
      taskCount: reportData?.tasks?.length || 0,
      accomplishments: reportData?.accomplishments?.length || 0,
      upcoming: reportData?.upcoming?.length || 0
    });
    // Use the new template function
    reportContent = generateStatusReportHTML({
      projectName,
      ...reportData
    });
  } else if (reportType === 'gantt' || reportType === 'kanban') {
    debugLogTagged('EMAIL DEBUG', `Generating ${reportType} HTML with task count:`, Array.isArray(reportData) ? reportData.length : 0);
    // Use the new template function
    reportContent = generateTaskReportHTML({
      projectName,
      reportType: reportType as 'gantt' | 'kanban',
      tasks: reportData
    });
  }
  
  debugLogTagged('EMAIL DEBUG', `Generated HTML content length:`, reportContent.length);
  debugLogTagged('EMAIL DEBUG', `HTML contains 'Task Details':`, reportContent.includes('Task Details'));
  debugLogTagged('EMAIL DEBUG', `HTML contains '<table>':`, reportContent.includes('<table>'));
  debugLogTagged('EMAIL DEBUG', '========== SEND PROJECT REPORT END ==========');

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
  // Always log important email operations
  log(`[EMAIL] Sending portfolio summary for ${projectsData.length} project(s) to ${recipients.length} recipient(s)`);
  
  // Verbose debug logging (development only)
  debugLogTagged('PORTFOLIO EMAIL DEBUG', '========== SEND PORTFOLIO SUMMARY START ==========');
  debugLogTagged('PORTFOLIO EMAIL DEBUG', `Projects count:`, projectsData.length);
  debugLogTagged('PORTFOLIO EMAIL DEBUG', `Recipients count:`, recipients.length);
  
  // Validate projectsData
  if (!projectsData || !Array.isArray(projectsData) || projectsData.length === 0) {
    throw new Error('Portfolio summary requires at least one project');
  }
  
  // Log and validate task information for each project (development only)
  projectsData.forEach((project, index) => {
    debugLogTagged('PORTFOLIO EMAIL DEBUG', `Project ${index + 1} ("${project.name}"):`);
    debugLogTagged('PORTFOLIO EMAIL DEBUG', `  - Has tasks array:`, !!project.tasks);
    debugLogTagged('PORTFOLIO EMAIL DEBUG', `  - Tasks is array:`, Array.isArray(project.tasks));
    debugLogTagged('PORTFOLIO EMAIL DEBUG', `  - Task count:`, project.tasks?.length || 0);
    debugLogTagged('PORTFOLIO EMAIL DEBUG', `  - Total tasks (calculated):`, project.totalTasks);
    
    // Validate each project has tasks array - fail fast if missing
    if (!project.tasks) {
      throw new Error(`Portfolio summary error: Project "${project.name}" is missing task data. Task information is required for all projects in the portfolio.`);
    }
    
    // Log first task if available
    if (project.tasks && project.tasks.length > 0) {
      debugLogTagged('PORTFOLIO EMAIL DEBUG', `  - First task:`, {
        title: project.tasks[0].title,
        status: project.tasks[0].status,
        assignee: project.tasks[0].assigneeName
      });
    }
  });
  
  // Count total tasks across all projects
  const totalTasksAcrossPortfolio = projectsData.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
  debugLogTagged('PORTFOLIO EMAIL DEBUG', `Total tasks across all projects:`, totalTasksAcrossPortfolio);
  
  if (totalTasksAcrossPortfolio === 0) {
    log(`[EMAIL WARNING] Portfolio has no tasks across any projects`);
  }
  
  // Use the new template function
  const reportContent = generatePortfolioSummaryHTML({
    projects: projectsData
  });
  
  debugLogTagged('PORTFOLIO EMAIL DEBUG', `Generated HTML length:`, reportContent.length);
  debugLogTagged('PORTFOLIO EMAIL DEBUG', `HTML contains task tables:`, reportContent.includes('<th>Task</th>'));
  
  // Check for actual task content in the HTML (development only)
  const taskSectionCount = (reportContent.match(/<h4[^>]*>Tasks<\/h4>/g) || []).length;
  const noTasksMessageCount = (reportContent.match(/No tasks found for this project/g) || []).length;
  const taskRowCount = (reportContent.match(/<tr style="border-bottom: 1px solid #e5e7eb;">/g) || []).length;
  
  debugLogTagged('PORTFOLIO EMAIL DEBUG', `Task sections in HTML: ${taskSectionCount}`);
  debugLogTagged('PORTFOLIO EMAIL DEBUG', `"No tasks" messages: ${noTasksMessageCount}`);
  debugLogTagged('PORTFOLIO EMAIL DEBUG', `Task data rows in HTML: ${taskRowCount}`);
  debugLogTagged('PORTFOLIO EMAIL DEBUG', '========== SEND PORTFOLIO SUMMARY END ==========');

  await sendEmail({
    to: recipients,
    subject: 'Portfolio Summary - All Active Projects',
    body: reportContent,
    isHtml: true
  });
}