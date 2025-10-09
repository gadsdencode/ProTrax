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
  let reportContent = '';
  
  if (reportType === 'summary') {
    reportContent = generateProjectSummaryHTML(projectName, reportData);
  } else if (reportType === 'status') {
    reportContent = generateStatusReportHTML(projectName, reportData);
  } else if (reportType === 'gantt' || reportType === 'kanban') {
    reportContent = generateTaskReportHTML(projectName, reportType, reportData);
  }

  await sendEmail({
    to: recipients,
    subject: `${projectName} - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
    body: reportContent,
    isHtml: true
  });
}

function generateProjectSummaryHTML(projectName: string, data: any): string {
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

      ${data.tasks && data.tasks.length > 0 ? `
        <div class="section">
          <h2>Recent Tasks</h2>
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              ${data.tasks.slice(0, 10).map((task: any) => `
                <tr>
                  <td>${task.title}</td>
                  <td>${task.status || 'N/A'}</td>
                  <td>${task.priority || 'N/A'}</td>
                  <td>${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
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

function generateStatusReportHTML(projectName: string, data: any): string {
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
        <p><strong>Progress:</strong> ${data.progress || 0}%</p>
      </div>

      <div class="section">
        <h2>Accomplishments</h2>
        <ul>
          ${data.accomplishments && data.accomplishments.length > 0 
            ? data.accomplishments.map((item: string) => `<li>${item}</li>`).join('') 
            : '<li>No accomplishments reported</li>'}
        </ul>
      </div>

      <div class="section">
        <h2>Upcoming Activities</h2>
        <ul>
          ${data.upcoming && data.upcoming.length > 0 
            ? data.upcoming.map((item: string) => `<li>${item}</li>`).join('') 
            : '<li>No upcoming activities</li>'}
        </ul>
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
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #3B82F6; color: white; padding: 20px; border-radius: 8px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f3f4f6; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${projectName}</h1>
        <p>${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</p>
      </div>
      
      <div class="section">
        <h2>Tasks Overview</h2>
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Assignee</th>
              <th>Due Date</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            ${tasks.map((task: any) => `
              <tr>
                <td>${task.title}</td>
                <td>${task.status || 'N/A'}</td>
                <td>${task.priority || 'N/A'}</td>
                <td>${task.assigneeId || 'Unassigned'}</td>
                <td>${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                <td>${task.progress || 0}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <p style="color: #6b7280; font-size: 12px;">
          Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </p>
      </div>
    </body>
    </html>
  `;
}
