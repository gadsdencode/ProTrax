import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { Client } from "@replit/object-storage";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { errorHandler, asyncHandler, createError } from "./errorHandler";
import {
  insertProjectSchema,
  insertTaskSchema,
  insertTaskDependencySchema,
  insertCustomFieldSchema,
  insertCommentSchema,
  insertFileAttachmentSchema,
  insertRiskSchema,
  insertBudgetItemSchema,
  insertTimeEntrySchema,
  insertExpenseSchema,
  insertAutomationRuleSchema,
  insertDashboardWidgetSchema,
  insertProjectTemplateSchema,
  insertKanbanColumnSchema,
  insertProjectStakeholderSchema,
  insertNotificationSchema,
} from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // ============= AUTH ROUTES =============
  
  app.get('/api/auth/user', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    res.json(user);
  }));

  // ============= USER ROUTES =============
  
  app.get('/api/users', isAuthenticated, asyncHandler(async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  }));

  // ============= PROJECT ROUTES =============
  
  app.get('/api/projects', isAuthenticated, asyncHandler(async (req, res) => {
    const searchQuery = req.query.searchQuery as string | undefined;
    const projects = await storage.getProjects(searchQuery);
    res.json(projects);
  }));

  app.get('/api/projects/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const project = await storage.getProject(id);
    if (!project) {
      throw createError.notFound("Project not found");
    }
    res.json(project);
  }));

  app.post('/api/projects', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const data = insertProjectSchema.parse({ ...req.body, managerId: userId });
    const project = await storage.createProject(data);
    res.status(201).json(project);
  }));

  app.patch('/api/projects/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const project = await storage.updateProject(id, req.body);
    res.json(project);
  }));

  app.delete('/api/projects/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteProject(id);
    res.status(204).send();
  }));

  // ============= TASK ROUTES =============
  
  app.get('/api/tasks', isAuthenticated, asyncHandler(async (req, res) => {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    const searchQuery = req.query.searchQuery as string | undefined;
    const tasks = await storage.getTasks(projectId, searchQuery);
    res.json(tasks);
  }));

  app.get('/api/tasks/my-tasks', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const tasks = await storage.getMyTasks(userId);
    res.json(tasks);
  }));

  app.get('/api/tasks/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const task = await storage.getTask(id);
    if (!task) {
      throw createError.notFound("Task not found");
    }
    res.json(task);
  }));

  app.post('/api/tasks', isAuthenticated, asyncHandler(async (req, res) => {
    const data = insertTaskSchema.parse(req.body);
    const task = await storage.createTask(data);
    res.status(201).json(task);
  }));

  app.patch('/api/tasks/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const task = await storage.updateTask(id, req.body);
    res.json(task);
  }));

  app.delete('/api/tasks/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteTask(id);
    res.status(204).send();
  }));

  // ============= TASK DEPENDENCY ROUTES =============
  
  app.get('/api/tasks/:taskId/dependencies', isAuthenticated, asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const dependencies = await storage.getTaskDependencies(taskId);
    res.json(dependencies);
  }));

  app.post('/api/task-dependencies', isAuthenticated, asyncHandler(async (req, res) => {
    const data = insertTaskDependencySchema.parse(req.body);
    const dependency = await storage.createTaskDependency(data);
    res.status(201).json(dependency);
  }));

  // ============= CUSTOM FIELD ROUTES =============
  
  app.get('/api/projects/:projectId/custom-fields', isAuthenticated, asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const fields = await storage.getCustomFields(projectId);
    res.json(fields);
  }));

  app.post('/api/custom-fields', isAuthenticated, asyncHandler(async (req, res) => {
    const data = insertCustomFieldSchema.parse(req.body);
    const field = await storage.createCustomField(data);
    res.status(201).json(field);
  }));

  // ============= COMMENT ROUTES =============
  
  app.get('/api/comments', isAuthenticated, asyncHandler(async (req, res) => {
    if (!req.query.taskId) {
      throw createError.badRequest("taskId query parameter is required");
    }
    const taskId = parseInt(req.query.taskId as string);
    if (isNaN(taskId)) {
      throw createError.badRequest("taskId must be a valid number");
    }
    const comments = await storage.getComments(taskId);
    res.json(comments);
  }));

  app.get('/api/tasks/:taskId/comments', isAuthenticated, asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const comments = await storage.getComments(taskId);
    res.json(comments);
  }));

  app.post('/api/comments', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const data = insertCommentSchema.parse({ ...req.body, userId });
    const comment = await storage.createComment(data);
    res.status(201).json(comment);
  }));

  // ============= FILE ATTACHMENT ROUTES =============
  
  app.get('/api/file-attachments', isAuthenticated, asyncHandler(async (req, res) => {
    const taskId = req.query.taskId ? parseInt(req.query.taskId as string) : undefined;
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    const attachments = await storage.getFileAttachments(taskId, projectId);
    res.json(attachments);
  }));

  // Upload file endpoint
  app.post('/api/file-attachments/upload', isAuthenticated, upload.single('file'), asyncHandler(async (req: any, res) => {
    if (!req.file) {
      throw createError.badRequest("No file uploaded");
    }

    const userId = req.user.claims.sub;
    const { projectId, taskId } = req.body;
    
    // Generate unique filename with folder structure
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(7);
    const fileExt = path.extname(req.file.originalname);
    const fileName = `${timestamp}-${uniqueId}${fileExt}`;
    
    // Determine storage path based on whether file should be private or public
    const isPrivate = req.body.isPrivate === 'true';
    const folder = isPrivate ? '.private' : 'public/attachments';
    const objectKey = `${folder}/${fileName}`;

    // Initialize object storage client with the bucket ID
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    const client = new Client({ bucketId });
    
    // Upload file to object storage using the client
    const uploadResult = await client.uploadFromBytes(objectKey, req.file.buffer);
    
    if (!uploadResult.ok) {
      throw new Error(uploadResult.error?.message || "Failed to upload to object storage");
    }
    
    // Save file metadata to database
    const attachmentData = {
      userId,
      projectId: projectId ? parseInt(projectId) : undefined,
      taskId: taskId ? parseInt(taskId) : undefined,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      storageUrl: objectKey, // Store the full object key
      version: 1,
    };
    
    const attachment = await storage.createFileAttachment(attachmentData);
    res.status(201).json(attachment);
  }));

  // Download/serve file endpoint
  app.get('/api/file-attachments/:id/download', isAuthenticated, asyncHandler(async (req: any, res) => {
    const attachmentId = parseInt(req.params.id);
    const attachment = await storage.getFileAttachment(attachmentId);
    
    if (!attachment) {
      throw createError.notFound("File not found");
    }
    
    // Check if user has access to this file
    if (attachment.projectId) {
      // For project files, verify user is a stakeholder or project manager
      const project = await storage.getProject(attachment.projectId);
      if (!project) {
        throw createError.notFound("Project not found");
      }
      // Note: In a production app, you'd want to check if user is a stakeholder
    }
    
    // Initialize object storage client with the bucket ID
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    const client = new Client({ bucketId });
    
    // Download file from object storage
    const downloadResult = await client.downloadAsBytes(attachment.storageUrl);
    
    if (!downloadResult.ok) {
      console.error("Error fetching from object storage:", downloadResult.error);
      throw createError.notFound("File not found in storage");
    }
    
    // Ensure we have a proper Buffer
    let fileBuffer = downloadResult.value;
    
    // Convert to Buffer if it's not already one
    if (!Buffer.isBuffer(fileBuffer)) {
      if (fileBuffer && typeof fileBuffer === 'object' && fileBuffer.type === 'Buffer' && Array.isArray(fileBuffer.data)) {
        // It's a JSON-encoded Buffer, convert it back
        fileBuffer = Buffer.from(fileBuffer.data);
      } else if (Array.isArray(fileBuffer)) {
        // It's an array of bytes
        fileBuffer = Buffer.from(fileBuffer);
      } else {
        console.error("Unexpected buffer type:", typeof fileBuffer);
        throw new Error("Invalid file data from storage");
      }
    }
    
    // Set appropriate headers
    // Use 'inline' for preview-capable files, 'attachment' for others
    const disposition = attachment.mimeType && (
      attachment.mimeType.startsWith('image/') ||
      attachment.mimeType.startsWith('video/') ||
      attachment.mimeType.startsWith('audio/') ||
      attachment.mimeType.includes('pdf') ||
      attachment.mimeType.includes('text') ||
      attachment.mimeType.includes('html')
    ) ? 'inline' : 'attachment';
    
    res.set({
      'Content-Type': attachment.mimeType || 'application/octet-stream',
      'Content-Disposition': `${disposition}; filename="${attachment.fileName}"`,
      'Content-Length': fileBuffer.length.toString(),
      'Cache-Control': 'private, max-age=3600',
    });
    
    // Send the buffer directly - Express will handle it correctly
    res.send(fileBuffer);
  }));

  // Delete file endpoint
  app.delete('/api/file-attachments/:id', isAuthenticated, asyncHandler(async (req: any, res) => {
    const attachmentId = parseInt(req.params.id);
    const attachment = await storage.getFileAttachment(attachmentId);
    
    if (!attachment) {
      throw createError.notFound("File not found");
    }
    
    // Check if user has permission to delete (must be uploader or project manager)
    const userId = req.user.claims.sub;
    if (attachment.userId !== userId) {
      if (attachment.projectId) {
        const project = await storage.getProject(attachment.projectId);
        if (project?.managerId !== userId) {
          throw createError.forbidden("Permission denied");
        }
      } else {
        throw createError.forbidden("Permission denied");
      }
    }
    
    // Initialize object storage client with the bucket ID
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    const client = new Client({ bucketId });
    
    // Delete from object storage
    const deleteResult = await client.delete(attachment.storageUrl);
    
    if (!deleteResult.ok) {
      console.warn("Error deleting from storage:", deleteResult.error, "- continuing with database deletion");
    }
    
    // Delete from database
    await storage.deleteFileAttachment(attachmentId);
    
    res.json({ message: "File deleted successfully" });
  }));

  // ============= RISK ROUTES =============
  
  app.get('/api/projects/:projectId/risks', isAuthenticated, asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const risks = await storage.getRisks(projectId);
    res.json(risks);
  }));

  app.post('/api/risks', isAuthenticated, asyncHandler(async (req, res) => {
    const data = insertRiskSchema.parse(req.body);
    const risk = await storage.createRisk(data);
    res.status(201).json(risk);
  }));

  app.patch('/api/risks/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const risk = await storage.updateRisk(id, req.body);
    res.json(risk);
  }));

  // ============= BUDGET ROUTES =============
  
  app.get('/api/projects/:projectId/budget-items', isAuthenticated, asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const items = await storage.getBudgetItems(projectId);
    res.json(items);
  }));

  app.post('/api/budget-items', isAuthenticated, asyncHandler(async (req, res) => {
    const data = insertBudgetItemSchema.parse(req.body);
    const item = await storage.createBudgetItem(data);
    res.status(201).json(item);
  }));

  // ============= TIME ENTRY ROUTES =============
  
  app.get('/api/tasks/:taskId/time-entries', isAuthenticated, asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const entries = await storage.getTimeEntries(taskId);
    res.json(entries);
  }));

  app.post('/api/time-entries', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const data = insertTimeEntrySchema.parse({ ...req.body, userId });
    const entry = await storage.createTimeEntry(data);
    res.status(201).json(entry);
  }));

  // ============= EXPENSE ROUTES =============
  
  app.get('/api/projects/:projectId/expenses', isAuthenticated, asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const expenses = await storage.getExpenses(projectId);
    res.json(expenses);
  }));

  app.post('/api/expenses', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const data = insertExpenseSchema.parse({ ...req.body, userId });
    const expense = await storage.createExpense(data);
    res.status(201).json(expense);
  }));

  // ============= AUTOMATION RULE ROUTES =============
  
  app.get('/api/projects/:projectId/automation-rules', isAuthenticated, asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const rules = await storage.getAutomationRules(projectId);
    res.json(rules);
  }));

  app.post('/api/automation-rules', isAuthenticated, asyncHandler(async (req, res) => {
    const data = insertAutomationRuleSchema.parse(req.body);
    const rule = await storage.createAutomationRule(data);
    res.status(201).json(rule);
  }));

  // ============= DASHBOARD WIDGET ROUTES =============
  
  app.get('/api/dashboard-widgets', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const widgets = await storage.getDashboardWidgets(userId);
    res.json(widgets);
  }));

  app.post('/api/dashboard-widgets', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const data = insertDashboardWidgetSchema.parse({ ...req.body, userId });
    const widget = await storage.createDashboardWidget(data);
    res.status(201).json(widget);
  }));

  // ============= PROJECT TEMPLATE ROUTES =============
  
  app.get('/api/project-templates', isAuthenticated, asyncHandler(async (req, res) => {
    const templates = await storage.getProjectTemplates();
    res.json(templates);
  }));

  app.post('/api/project-templates', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const data = insertProjectTemplateSchema.parse({ ...req.body, createdBy: userId });
    const template = await storage.createProjectTemplate(data);
    res.status(201).json(template);
  }));

  // ============= KANBAN COLUMN ROUTES =============
  
  app.get('/api/kanban/columns', isAuthenticated, asyncHandler(async (req, res) => {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    if (!projectId) {
      return res.json([]);
    }
    const columns = await storage.getKanbanColumns(projectId);
    res.json(columns);
  }));

  app.post('/api/kanban/columns', isAuthenticated, asyncHandler(async (req, res) => {
    const data = insertKanbanColumnSchema.parse(req.body);
    const column = await storage.createKanbanColumn(data);
    res.status(201).json(column);
  }));

  // ============= PROJECT STAKEHOLDER ROUTES =============
  
  app.get('/api/projects/:id/stakeholders', isAuthenticated, asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.id);
    const stakeholders = await storage.getProjectStakeholders(projectId);
    res.json(stakeholders);
  }));

  app.post('/api/projects/:id/stakeholders', isAuthenticated, asyncHandler(async (req: any, res) => {
    const projectId = parseInt(req.params.id);
    const userId = req.user.claims.sub;
    
    // Validate input
    const data = insertProjectStakeholderSchema.parse({
      ...req.body,
      projectId,
      addedBy: userId
    });
    
    // Check if stakeholder already exists
    const existing = await storage.getProjectStakeholders(projectId);
    if (existing.some(s => s.userId === data.userId)) {
      throw createError.badRequest("User is already a stakeholder");
    }
    
    const stakeholder = await storage.addProjectStakeholder(data);
    res.status(201).json(stakeholder);
  }));

  app.delete('/api/projects/:id/stakeholders/:userId', isAuthenticated, asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.id);
    const userId = req.params.userId;
    await storage.removeProjectStakeholder(projectId, userId);
    res.status(204).send();
  }));

  app.patch('/api/stakeholders/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const updates = req.body;
    const stakeholder = await storage.updateProjectStakeholder(id, updates);
    res.json(stakeholder);
  }));

  // ============= NOTIFICATION ROUTES =============
  
  app.get('/api/notifications', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const notifications = await storage.getNotifications(userId);
    res.json(notifications);
  }));

  app.post('/api/notifications/:id/read', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.markNotificationRead(id);
    res.status(204).send();
  }));

  // ============= AI & ANALYTICS ROUTES =============
  
  app.post('/api/ai/predict-deadline', isAuthenticated, asyncHandler(async (req, res) => {
    const { predictProjectDeadline } = await import('./gemini');
    const { projectId } = req.body;
    
    if (!projectId) {
      throw createError.badRequest("projectId is required");
    }
    
    // Fetch tasks for the project
    const tasks = await storage.getTasks(projectId);
    const prediction = await predictProjectDeadline(tasks);
    res.json(prediction);
  }));

  app.post('/api/ai/generate-summary', isAuthenticated, asyncHandler(async (req, res) => {
    const { generateProjectSummary } = await import('./gemini');
    const { projectId } = req.body;
    
    if (!projectId) {
      throw createError.badRequest("projectId is required");
    }
    
    // Fetch project data
    const project = await storage.getProject(projectId);
    if (!project) {
      throw createError.notFound("Project not found");
    }
    
    const summary = await generateProjectSummary(project);
    res.json({ summary });
  }));

  app.post('/api/ai/summarize-comments', isAuthenticated, asyncHandler(async (req, res) => {
    const { summarizeComments } = await import('./gemini');
    const { comments } = req.body;
    const summary = await summarizeComments(comments);
    res.json({ summary });
  }));

  app.post('/api/ai/assess-risk', isAuthenticated, asyncHandler(async (req, res) => {
    const { assessRisk } = await import('./gemini');
    const { riskDescription } = req.body;
    const assessment = await assessRisk(riskDescription);
    res.json(assessment);
  }));

  // ============= EXPORT ROUTES =============
  
  app.post('/api/export/excel', isAuthenticated, asyncHandler(async (req, res) => {
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

  // ============= EMAIL ROUTES =============
  
  app.post('/api/email/send-report', isAuthenticated, asyncHandler(async (req, res) => {
    const { sendProjectReport } = await import('./outlook');
    const { projectId, reportType, recipients } = req.body;
    
    if (!projectId || !reportType || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw createError.badRequest("projectId, reportType, and recipients array are required");
    }

    // Fetch project data
    const project = await storage.getProject(projectId);
    if (!project) {
      throw createError.notFound("Project not found");
    }

    // Fetch tasks for the project
    const tasks = await storage.getTasks(projectId);
    
    // Prepare report data based on type
    let reportData: any = {};
    
    if (reportType === 'summary') {
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
      
      reportData = {
        description: project.description,
        status: project.status,
        manager: project.managerId,
        startDate: project.startDate,
        endDate: project.endDate,
        budget: project.budget,
        totalTasks,
        completedTasks,
        inProgressTasks,
        tasks
      };
    } else if (reportType === 'status') {
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // Get risks
      const risks = await storage.getRisks(projectId);
      
      reportData = {
        overallStatus: progress >= 80 ? 'on_track' : progress >= 50 ? 'at_risk' : 'delayed',
        progress,
        accomplishments: tasks
          .filter(t => t.status === 'done')
          .slice(0, 5)
          .map(t => t.title),
        upcoming: tasks
          .filter(t => t.status === 'todo' || t.status === 'in_progress')
          .slice(0, 5)
          .map(t => t.title),
        risks: risks.slice(0, 5)
      };
    } else {
      // For gantt/kanban reports, just send tasks
      reportData = tasks;
    }

    await sendProjectReport(project.name, reportType, reportData, recipients);
    
    res.json({ 
      message: "Report sent successfully",
      recipientCount: recipients.length 
    });
  }));

  // ============= ERROR HANDLING MIDDLEWARE =============
  // Must be registered AFTER all routes
  app.use(errorHandler);

  // ============= WEBSOCKET SERVER =============
  
  const httpServer = createServer(app);
  
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      console.log('Received:', message.toString());
      
      // Broadcast to all clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  return httpServer;
}
