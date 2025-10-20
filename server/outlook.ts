import { Client } from '@microsoft/microsoft-graph-client';

// Import template functions
import { generateProjectSummaryHTML } from './templates/email/project-summary.template';
import { generateStatusReportHTML } from './templates/email/status-report.template';
import { generateTaskReportHTML } from './templates/email/task-report.template';
import { generatePortfolioSummaryHTML } from './templates/email/portfolio-summary.template';

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
    // Use the new template function
    reportContent = generateProjectSummaryHTML({
      projectName,
      ...reportData
    });
  } else if (reportType === 'status') {
    console.log(`[EMAIL DEBUG] Generating status HTML with data:`, {
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
    console.log(`[EMAIL DEBUG] Generating ${reportType} HTML with task count:`, Array.isArray(reportData) ? reportData.length : 0);
    // Use the new template function
    reportContent = generateTaskReportHTML({
      projectName,
      reportType: reportType as 'gantt' | 'kanban',
      tasks: reportData
    });
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
  
  // Use the new template function
  const reportContent = generatePortfolioSummaryHTML({
    projects: projectsData
  });
  
  console.log(`[PORTFOLIO EMAIL DEBUG] Generated HTML length:`, reportContent.length);
  console.log(`[PORTFOLIO EMAIL DEBUG] HTML contains task tables:`, reportContent.includes('<th>Task</th>'));
  
  // Check for actual task content in the HTML
  const taskSectionCount = (reportContent.match(/<h4[^>]*>Tasks<\/h4>/g) || []).length;
  const noTasksMessageCount = (reportContent.match(/No tasks found for this project/g) || []).length;
  const taskRowCount = (reportContent.match(/<tr style="border-bottom: 1px solid #e5e7eb;">/g) || []).length;
  
  console.log(`[PORTFOLIO EMAIL DEBUG] Task sections in HTML: ${taskSectionCount}`);
  console.log(`[PORTFOLIO EMAIL DEBUG] "No tasks" messages: ${noTasksMessageCount}`);
  console.log(`[PORTFOLIO EMAIL DEBUG] Task data rows in HTML: ${taskRowCount}`);
  console.log(`[PORTFOLIO EMAIL DEBUG] ========== SEND PORTFOLIO SUMMARY END ==========`);

  await sendEmail({
    to: recipients,
    subject: 'Portfolio Summary - All Active Projects',
    body: reportContent,
    isHtml: true
  });
}