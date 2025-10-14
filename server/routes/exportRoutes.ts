import { Router } from "express";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler } from "../errorHandler";

const router = Router();

// Export to CSV
router.post('/excel', isAuthenticated, asyncHandler(async (req, res) => {
  const { reportType, data } = req.body;
  
  // Simple CSV export for now (Excel export would require additional library)
  let csvContent = '';
  
  if (reportType === 'gantt' && Array.isArray(data)) {
    csvContent = 'Task,Start Date,End Date,Status,Progress\n';
    data.forEach((task: any) => {
      csvContent += `"${task.title}","${task.startDate || ''}","${task.dueDate || ''}","${task.status || ''}","${task.progress || 0}%"\n`;
    });
  } else if (reportType === 'kanban' && Array.isArray(data)) {
    csvContent = 'Task,Status,Priority,Assignee,Due Date\n';
    data.forEach((task: any) => {
      csvContent += `"${task.title}","${task.status || ''}","${task.priority || ''}","${task.assigneeId || ''}","${task.dueDate || ''}"\n`;
    });
  }
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${reportType}-export.csv"`);
  res.send(csvContent);
}));

export default router;