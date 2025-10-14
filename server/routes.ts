import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import { errorHandler } from "./errorHandler";
import { setupAuth } from "./replitAuth";

// Import all route modules
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import projectRoutes from "./routes/projectRoutes";
import sprintRoutes from "./routes/sprintRoutes";
import taskRoutes from "./routes/taskRoutes";
import taskDependencyRoutes from "./routes/taskDependencyRoutes";
import customFieldRoutes from "./routes/customFieldRoutes";
import commentRoutes from "./routes/commentRoutes";
import fileAttachmentRoutes from "./routes/fileAttachmentRoutes";
import riskRoutes from "./routes/riskRoutes";
import budgetRoutes from "./routes/budgetRoutes";
import timeEntryRoutes from "./routes/timeEntryRoutes";
import expenseRoutes from "./routes/expenseRoutes";
import automationRoutes from "./routes/automationRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import projectTemplateRoutes from "./routes/projectTemplateRoutes";
import kanbanRoutes from "./routes/kanbanRoutes";
import stakeholderRoutes from "./routes/stakeholderRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import aiRoutes from "./routes/aiRoutes";
import exportRoutes from "./routes/exportRoutes";
import emailRoutes from "./routes/emailRoutes";
import debugRoutes from "./routes/debugRoutes";
import recurringTaskRoutes from "./routes/recurringTaskRoutes";

export function setupRoutes(app: express.Application) {
  // Setup authentication middleware first
  setupAuth(app);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Mount all route modules
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/sprints', sprintRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/task-dependencies', taskDependencyRoutes);
  app.use('/api/custom-fields', customFieldRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/file-attachments', fileAttachmentRoutes);
  app.use('/api/risks', riskRoutes);
  app.use('/api/budget-items', budgetRoutes);
  app.use('/api/time-entries', timeEntryRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/automation-rules', automationRoutes);
  app.use('/api/dashboard-widgets', dashboardRoutes);
  app.use('/api/project-templates', projectTemplateRoutes);
  app.use('/api/kanban', kanbanRoutes);
  app.use('/api/stakeholders', stakeholderRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api/email', emailRoutes);
  app.use('/api/debug', debugRoutes);
  app.use('/api/recurring', recurringTaskRoutes);

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