/**
 * Shared CSS styles for all email templates
 */

export const baseStyles = `
  body { 
    font-family: Arial, sans-serif; 
    line-height: 1.6; 
    color: #333; 
    margin: 0;
    padding: 20px;
  }
  
  .header { 
    background: #3B82F6; 
    color: white; 
    padding: 20px; 
    border-radius: 8px; 
    margin-bottom: 20px;
  }
  
  .header h1 {
    margin: 0 0 10px 0;
  }
  
  .header p {
    margin: 0;
    opacity: 0.9;
  }
  
  .section { 
    margin: 20px 0; 
    padding: 15px; 
    border: 1px solid #e5e7eb; 
    border-radius: 8px; 
  }
  
  .section h2 {
    margin-top: 0;
    color: #111827;
  }
  
  .error { 
    background: #fee2e2; 
    color: #991b1b; 
    padding: 20px; 
    border-radius: 8px; 
  }
  
  .metric { 
    display: inline-block; 
    margin: 10px 20px 10px 0; 
  }
  
  .metric-label { 
    font-size: 12px; 
    color: #6b7280; 
    text-transform: uppercase; 
  }
  
  .metric-value { 
    font-size: 24px; 
    font-weight: bold; 
    color: #3B82F6; 
  }
  
  table { 
    width: 100%; 
    border-collapse: collapse; 
    margin: 15px 0; 
  }
  
  th, td { 
    padding: 12px; 
    text-align: left; 
    border-bottom: 1px solid #e5e7eb; 
  }
  
  th { 
    background: #f3f4f6; 
    font-weight: 600; 
    font-size: 13px;
  }
  
  td {
    font-size: 14px;
  }
  
  .task-description { 
    font-size: 12px; 
    color: #6b7280; 
    margin-top: 4px; 
  }
  
  .progress-bar { 
    background: #e5e7eb; 
    border-radius: 4px; 
    height: 6px; 
    width: 60px; 
    display: inline-block; 
  }
  
  .progress-fill { 
    background: #3B82F6; 
    height: 100%; 
    border-radius: 4px; 
  }
  
  .status-badge { 
    display: inline-block; 
    padding: 4px 12px; 
    border-radius: 12px; 
    font-size: 12px; 
    font-weight: 600; 
  }
  
  .status-on-track { 
    background: #dcfce7; 
    color: #166534; 
  }
  
  .status-at-risk { 
    background: #fef3c7; 
    color: #92400e; 
  }
  
  .status-delayed { 
    background: #fee2e2; 
    color: #991b1b; 
  }
  
  .task-item { 
    margin-bottom: 12px; 
    padding: 10px; 
    background: #f9fafb; 
    border-radius: 6px; 
  }
  
  .task-header { 
    display: flex; 
    justify-content: space-between; 
    margin-bottom: 4px; 
  }
  
  .task-meta { 
    font-size: 12px; 
    color: #6b7280; 
  }
  
  .priority-high { 
    color: #ea580c; 
    font-weight: 600; 
  }
  
  .priority-critical { 
    color: #dc2626; 
    font-weight: 600; 
  }
  
  .footer {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
    color: #6b7280;
    font-size: 12px;
  }
`;

export const portfolioStyles = `
  ${baseStyles}
  
  body { 
    max-width: 1200px; 
    margin: 0 auto; 
  }
  
  .header {
    padding: 30px;
    margin-bottom: 30px;
  }
  
  .summary-stats { 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
    gap: 20px; 
    margin-bottom: 30px; 
  }
  
  .stat-card { 
    background: #f9fafb; 
    padding: 20px; 
    border-radius: 8px; 
    border: 1px solid #e5e7eb; 
  }
  
  .stat-label { 
    font-size: 12px; 
    color: #6b7280; 
    text-transform: uppercase; 
    margin-bottom: 8px; 
  }
  
  .stat-value { 
    font-size: 32px; 
    font-weight: bold; 
    color: #3B82F6; 
  }
  
  .project-card { 
    background: white; 
    border: 1px solid #e5e7eb; 
    border-radius: 8px; 
    padding: 20px; 
    margin-bottom: 20px; 
  }
  
  .project-header { 
    display: flex; 
    justify-content: space-between; 
    align-items: start; 
    margin-bottom: 15px; 
  }
  
  .project-name { 
    font-size: 20px; 
    font-weight: 600; 
    color: #111827; 
    margin: 0; 
  }
  
  .project-status { 
    display: inline-block; 
    padding: 4px 12px; 
    border-radius: 12px; 
    font-size: 12px; 
    font-weight: 600; 
    background: #dcfce7; 
    color: #166534; 
  }
  
  .project-metrics { 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
    gap: 15px; 
    margin-top: 15px; 
  }
  
  .metric-label { 
    font-size: 11px; 
    color: #6b7280; 
    text-transform: uppercase; 
  }
  
  .metric-value { 
    font-size: 18px; 
    font-weight: 600; 
    color: #3B82F6; 
  }
`;

export const kanbanStyles = `
  ${baseStyles}
  
  body { 
    max-width: 1200px; 
    margin: 0 auto; 
  }
  
  .summary { 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
    gap: 15px; 
    margin-bottom: 20px; 
  }
  
  .summary-item { 
    background: #f9fafb; 
    padding: 12px; 
    border-radius: 6px; 
  }
  
  .summary-label { 
    font-size: 12px; 
    color: #6b7280; 
    text-transform: uppercase; 
    margin-bottom: 4px; 
  }
  
  .summary-value { 
    font-size: 20px; 
    font-weight: bold; 
    color: #3B82F6; 
  }
  
  .kanban-column { 
    margin-bottom: 20px; 
  }
  
  .kanban-header { 
    background: #f3f4f6; 
    padding: 10px; 
    border-radius: 6px 6px 0 0; 
    font-weight: 600; 
  }
  
  .kanban-task { 
    background: white; 
    border: 1px solid #e5e7eb; 
    border-radius: 6px; 
    padding: 12px; 
    margin-bottom: 10px; 
  }
  
  .milestone-marker { 
    color: #9333ea; 
    font-weight: 600; 
  }
`;

/**
 * Wraps content with base HTML structure and styles
 */
export function wrapInHtmlDocument(content: string, styles: string = baseStyles): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        ${styles}
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;
}

/**
 * Creates an error template
 */
export function createErrorTemplate(title: string, message: string): string {
  return wrapInHtmlDocument(`
    <div class="error">
      <h1>${title}</h1>
      <p>${message}</p>
    </div>
  `);
}