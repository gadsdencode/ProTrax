import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
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
  insertNotificationSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // ============= AUTH ROUTES =============
  
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ============= USER ROUTES =============
  
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // ============= PROJECT ROUTES =============
  
  app.get('/api/projects', isAuthenticated, async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertProjectSchema.parse({ ...req.body, managerId: userId });
      const project = await storage.createProject(data);
      res.status(201).json(project);
    } catch (error: any) {
      console.error("Error creating project:", error);
      res.status(400).json({ message: error.message || "Failed to create project" });
    }
  });

  app.patch('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.updateProject(id, req.body);
      res.json(project);
    } catch (error: any) {
      console.error("Error updating project:", error);
      res.status(400).json({ message: error.message || "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProject(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // ============= TASK ROUTES =============
  
  app.get('/api/tasks', isAuthenticated, async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const tasks = await storage.getTasks(projectId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get('/api/tasks/my-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getMyTasks(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching my tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req, res) => {
    try {
      const data = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(data);
      res.status(201).json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: error.message || "Failed to create task" });
    }
  });

  app.patch('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.updateTask(id, req.body);
      res.json(task);
    } catch (error: any) {
      console.error("Error updating task:", error);
      res.status(400).json({ message: error.message || "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTask(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // ============= TASK DEPENDENCY ROUTES =============
  
  app.get('/api/tasks/:taskId/dependencies', isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const dependencies = await storage.getTaskDependencies(taskId);
      res.json(dependencies);
    } catch (error) {
      console.error("Error fetching dependencies:", error);
      res.status(500).json({ message: "Failed to fetch dependencies" });
    }
  });

  app.post('/api/task-dependencies', isAuthenticated, async (req, res) => {
    try {
      const data = insertTaskDependencySchema.parse(req.body);
      const dependency = await storage.createTaskDependency(data);
      res.status(201).json(dependency);
    } catch (error: any) {
      console.error("Error creating dependency:", error);
      res.status(400).json({ message: error.message || "Failed to create dependency" });
    }
  });

  // ============= CUSTOM FIELD ROUTES =============
  
  app.get('/api/projects/:projectId/custom-fields', isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const fields = await storage.getCustomFields(projectId);
      res.json(fields);
    } catch (error) {
      console.error("Error fetching custom fields:", error);
      res.status(500).json({ message: "Failed to fetch custom fields" });
    }
  });

  app.post('/api/custom-fields', isAuthenticated, async (req, res) => {
    try {
      const data = insertCustomFieldSchema.parse(req.body);
      const field = await storage.createCustomField(data);
      res.status(201).json(field);
    } catch (error: any) {
      console.error("Error creating custom field:", error);
      res.status(400).json({ message: error.message || "Failed to create custom field" });
    }
  });

  // ============= COMMENT ROUTES =============
  
  app.get('/api/tasks/:taskId/comments', isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const comments = await storage.getComments(taskId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post('/api/comments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertCommentSchema.parse({ ...req.body, userId });
      const comment = await storage.createComment(data);
      res.status(201).json(comment);
    } catch (error: any) {
      console.error("Error creating comment:", error);
      res.status(400).json({ message: error.message || "Failed to create comment" });
    }
  });

  // ============= FILE ATTACHMENT ROUTES =============
  
  app.get('/api/file-attachments', isAuthenticated, async (req, res) => {
    try {
      const taskId = req.query.taskId ? parseInt(req.query.taskId as string) : undefined;
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const attachments = await storage.getFileAttachments(taskId, projectId);
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching file attachments:", error);
      res.status(500).json({ message: "Failed to fetch file attachments" });
    }
  });

  app.post('/api/file-attachments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertFileAttachmentSchema.parse({ ...req.body, userId });
      const attachment = await storage.createFileAttachment(data);
      res.status(201).json(attachment);
    } catch (error: any) {
      console.error("Error creating file attachment:", error);
      res.status(400).json({ message: error.message || "Failed to create file attachment" });
    }
  });

  // ============= RISK ROUTES =============
  
  app.get('/api/projects/:projectId/risks', isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const risks = await storage.getRisks(projectId);
      res.json(risks);
    } catch (error) {
      console.error("Error fetching risks:", error);
      res.status(500).json({ message: "Failed to fetch risks" });
    }
  });

  app.post('/api/risks', isAuthenticated, async (req, res) => {
    try {
      const data = insertRiskSchema.parse(req.body);
      const risk = await storage.createRisk(data);
      res.status(201).json(risk);
    } catch (error: any) {
      console.error("Error creating risk:", error);
      res.status(400).json({ message: error.message || "Failed to create risk" });
    }
  });

  app.patch('/api/risks/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const risk = await storage.updateRisk(id, req.body);
      res.json(risk);
    } catch (error: any) {
      console.error("Error updating risk:", error);
      res.status(400).json({ message: error.message || "Failed to update risk" });
    }
  });

  // ============= BUDGET ROUTES =============
  
  app.get('/api/projects/:projectId/budget-items', isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const items = await storage.getBudgetItems(projectId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching budget items:", error);
      res.status(500).json({ message: "Failed to fetch budget items" });
    }
  });

  app.post('/api/budget-items', isAuthenticated, async (req, res) => {
    try {
      const data = insertBudgetItemSchema.parse(req.body);
      const item = await storage.createBudgetItem(data);
      res.status(201).json(item);
    } catch (error: any) {
      console.error("Error creating budget item:", error);
      res.status(400).json({ message: error.message || "Failed to create budget item" });
    }
  });

  // ============= TIME ENTRY ROUTES =============
  
  app.get('/api/tasks/:taskId/time-entries', isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const entries = await storage.getTimeEntries(taskId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  app.post('/api/time-entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertTimeEntrySchema.parse({ ...req.body, userId });
      const entry = await storage.createTimeEntry(data);
      res.status(201).json(entry);
    } catch (error: any) {
      console.error("Error creating time entry:", error);
      res.status(400).json({ message: error.message || "Failed to create time entry" });
    }
  });

  // ============= EXPENSE ROUTES =============
  
  app.get('/api/projects/:projectId/expenses', isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const expenses = await storage.getExpenses(projectId);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post('/api/expenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertExpenseSchema.parse({ ...req.body, userId });
      const expense = await storage.createExpense(data);
      res.status(201).json(expense);
    } catch (error: any) {
      console.error("Error creating expense:", error);
      res.status(400).json({ message: error.message || "Failed to create expense" });
    }
  });

  // ============= AUTOMATION RULE ROUTES =============
  
  app.get('/api/projects/:projectId/automation-rules', isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const rules = await storage.getAutomationRules(projectId);
      res.json(rules);
    } catch (error) {
      console.error("Error fetching automation rules:", error);
      res.status(500).json({ message: "Failed to fetch automation rules" });
    }
  });

  app.post('/api/automation-rules', isAuthenticated, async (req, res) => {
    try {
      const data = insertAutomationRuleSchema.parse(req.body);
      const rule = await storage.createAutomationRule(data);
      res.status(201).json(rule);
    } catch (error: any) {
      console.error("Error creating automation rule:", error);
      res.status(400).json({ message: error.message || "Failed to create automation rule" });
    }
  });

  // ============= DASHBOARD WIDGET ROUTES =============
  
  app.get('/api/dashboard-widgets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const widgets = await storage.getDashboardWidgets(userId);
      res.json(widgets);
    } catch (error) {
      console.error("Error fetching dashboard widgets:", error);
      res.status(500).json({ message: "Failed to fetch dashboard widgets" });
    }
  });

  app.post('/api/dashboard-widgets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertDashboardWidgetSchema.parse({ ...req.body, userId });
      const widget = await storage.createDashboardWidget(data);
      res.status(201).json(widget);
    } catch (error: any) {
      console.error("Error creating dashboard widget:", error);
      res.status(400).json({ message: error.message || "Failed to create dashboard widget" });
    }
  });

  // ============= PROJECT TEMPLATE ROUTES =============
  
  app.get('/api/project-templates', isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getProjectTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching project templates:", error);
      res.status(500).json({ message: "Failed to fetch project templates" });
    }
  });

  app.post('/api/project-templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertProjectTemplateSchema.parse({ ...req.body, createdBy: userId });
      const template = await storage.createProjectTemplate(data);
      res.status(201).json(template);
    } catch (error: any) {
      console.error("Error creating project template:", error);
      res.status(400).json({ message: error.message || "Failed to create project template" });
    }
  });

  // ============= KANBAN COLUMN ROUTES =============
  
  app.get('/api/kanban/columns', isAuthenticated, async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      if (!projectId) {
        return res.json([]);
      }
      const columns = await storage.getKanbanColumns(projectId);
      res.json(columns);
    } catch (error) {
      console.error("Error fetching kanban columns:", error);
      res.status(500).json({ message: "Failed to fetch kanban columns" });
    }
  });

  app.post('/api/kanban/columns', isAuthenticated, async (req, res) => {
    try {
      const data = insertKanbanColumnSchema.parse(req.body);
      const column = await storage.createKanbanColumn(data);
      res.status(201).json(column);
    } catch (error: any) {
      console.error("Error creating kanban column:", error);
      res.status(400).json({ message: error.message || "Failed to create kanban column" });
    }
  });

  // ============= NOTIFICATION ROUTES =============
  
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationRead(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ message: "Failed to mark notification read" });
    }
  });

  // ============= AI & ANALYTICS ROUTES =============
  
  app.post('/api/ai/predict-deadline', isAuthenticated, async (req, res) => {
    try {
      const { predictProjectDeadline } = await import('./gemini');
      const { taskData } = req.body;
      const prediction = await predictProjectDeadline(taskData);
      res.json(prediction);
    } catch (error: any) {
      console.error("Error predicting deadline:", error);
      res.status(500).json({ message: error.message || "Failed to predict deadline" });
    }
  });

  app.post('/api/ai/generate-summary', isAuthenticated, async (req, res) => {
    try {
      const { generateProjectSummary } = await import('./gemini');
      const { projectData } = req.body;
      const summary = await generateProjectSummary(projectData);
      res.json({ summary });
    } catch (error: any) {
      console.error("Error generating summary:", error);
      res.status(500).json({ message: error.message || "Failed to generate summary" });
    }
  });

  app.post('/api/ai/summarize-comments', isAuthenticated, async (req, res) => {
    try {
      const { summarizeComments } = await import('./gemini');
      const { comments } = req.body;
      const summary = await summarizeComments(comments);
      res.json({ summary });
    } catch (error: any) {
      console.error("Error summarizing comments:", error);
      res.status(500).json({ message: error.message || "Failed to summarize comments" });
    }
  });

  app.post('/api/ai/assess-risk', isAuthenticated, async (req, res) => {
    try {
      const { assessRisk } = await import('./gemini');
      const { riskDescription } = req.body;
      const assessment = await assessRisk(riskDescription);
      res.json(assessment);
    } catch (error: any) {
      console.error("Error assessing risk:", error);
      res.status(500).json({ message: error.message || "Failed to assess risk" });
    }
  });

  // ============= EXPORT ROUTES =============
  
  app.post('/api/export/excel', isAuthenticated, async (req, res) => {
    try {
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
    } catch (error: any) {
      console.error("Error exporting data:", error);
      res.status(500).json({ message: error.message || "Failed to export data" });
    }
  });

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
