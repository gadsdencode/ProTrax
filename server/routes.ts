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
import { SchedulingEngine } from "./scheduling";
import * as mammoth from "mammoth";
import * as pdfParseModule from "pdf-parse";
const pdfParse = (pdfParseModule as any).default || pdfParseModule;
import { extractProjectDataFromSOW } from "./gemini";
import {
  insertProjectSchema,
  insertSprintSchema,
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
  type User,
  type Project,
  type Task,
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

  // Test endpoint for SOW extraction
  app.post('/api/test-sow-extraction', isAuthenticated, asyncHandler(async (req, res) => {
    const { text } = req.body;
    if (!text) {
      throw createError.badRequest("No text provided");
    }
    
    console.log(`[TEST] Testing SOW extraction with ${text.length} characters`);
    
    try {
      const result = await extractProjectDataFromSOW(text);
      res.json(result);
    } catch (error: any) {
      console.error("[TEST] Extraction failed:", error);
      throw createError.badRequest(error.message || "Extraction failed");
    }
  }));

  // Create project from SOW document
  app.post('/api/projects/create-from-sow', isAuthenticated, upload.single('file'), asyncHandler(async (req: any, res) => {
    if (!req.file) {
      throw createError.badRequest("No file uploaded");
    }

    // Extract text from the document
    console.log(`[SOW Upload] Processing file: ${req.file.originalname}, type: ${req.file.mimetype}, size: ${req.file.size} bytes`);
    
    let text = "";
    const mimeType = req.file.mimetype;
    
    if (mimeType === "application/pdf") {
      // PDF file parsing
      console.log("[SOW Upload] Extracting text from PDF...");
      try {
        const data = await pdfParse(req.file.buffer);
        text = data.text;
        console.log(`[SOW Upload] Extracted ${text.length} characters from PDF`);
      } catch (error) {
        console.error("Error extracting text from PDF:", error);
        throw createError.badRequest("Failed to extract text from PDF document");
      }
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      // Word document (.docx or .doc)
      console.log("[SOW Upload] Extracting text from Word document...");
      try {
        const result = await mammoth.extractRawText({
          buffer: req.file.buffer,
        });
        text = result.value;
        console.log(`[SOW Upload] Extracted ${text.length} characters from Word document`);
      } catch (error) {
        console.error("Error extracting text from Word document:", error);
        throw createError.badRequest("Failed to extract text from Word document");
      }
    } else if (mimeType === "text/plain") {
      // Plain text file
      console.log("[SOW Upload] Processing plain text file...");
      text = req.file.buffer.toString('utf-8');
      console.log(`[SOW Upload] Extracted ${text.length} characters from text file`);
    } else {
      throw createError.badRequest(`Unsupported file type: ${mimeType}. Please upload a PDF, Word document (.docx) or text file.`);
    }

    if (!text || text.trim().length === 0) {
      throw createError.badRequest("The uploaded document appears to be empty");
    }
    
    // Log first 500 chars of extracted text for debugging
    console.log(`[SOW Upload] First 500 chars of extracted text: ${text.substring(0, 500)}`);
    console.log(`[SOW Upload] Document contains ${text.split(/\s+/).length} words`);

    // Extract project data from the SOW using Gemini
    let projectData;
    try {
      console.log("[SOW Upload] Calling Gemini API to extract project data...");
      projectData = await extractProjectDataFromSOW(text);
      console.log("[SOW Upload] Gemini API response received");
      console.log(`[SOW Upload] Extracted data: ${JSON.stringify(projectData, null, 2)}`);
    } catch (error: any) {
      console.error("[SOW Upload] Error extracting project data:", error);
      throw createError.badRequest(error.message || "Failed to extract project data from the SOW document");
    }

    // Extract tasks from the project data (we'll create them separately)
    const { tasks, ...projectFields } = projectData;
    console.log(`[SOW Upload] Tasks to create: ${tasks?.length || 0}`);

    // Create the project with the extracted data
    const userId = req.user.claims.sub;
    const data = insertProjectSchema.parse({ 
      ...projectFields, 
      managerId: userId,
      status: 'planning' // Set initial status
    });
    
    console.log(`[SOW Upload] Creating project: ${data.name}`);
    
    // Use transaction to ensure project and tasks are created atomically
    try {
      console.log(`[SOW Upload] Starting atomic creation of project and ${tasks?.length || 0} tasks...`);
      
      // Create project and tasks in a transaction - all or nothing
      const result = await storage.createProjectWithTasks(data, tasks || []);
      const { project, tasks: createdTasks } = result;
      
      console.log(`[SOW Upload] Transaction completed successfully`);
      console.log(`[SOW Upload] Project created with ID: ${project.id}`);
      console.log(`[SOW Upload] Successfully created all ${createdTasks.length} tasks`);
      
      res.status(201).json(project);
    } catch (error: any) {
      // If ANY task fails, the entire transaction is rolled back
      console.error(`[SOW Upload] Transaction failed - project and tasks were NOT created:`, error);
      throw createError.badRequest(
        `Failed to create project from SOW. ${error.message || "One or more tasks could not be created, so the entire operation was cancelled."}`
      );
    }
  }));

  // ============= SPRINT ROUTES =============
  
  app.get('/api/sprints', isAuthenticated, asyncHandler(async (req, res) => {
    const projectId = parseInt(req.query.projectId as string);
    const sprints = await storage.getSprints(projectId);
    res.json(sprints);
  }));

  app.get('/api/sprints/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const sprint = await storage.getSprint(id);
    if (!sprint) {
      throw createError.notFound("Sprint not found");
    }
    res.json(sprint);
  }));

  app.post('/api/sprints', isAuthenticated, asyncHandler(async (req, res) => {
    const data = insertSprintSchema.parse(req.body);
    const sprint = await storage.createSprint(data);
    res.status(201).json(sprint);
  }));

  app.patch('/api/sprints/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const sprint = await storage.updateSprint(id, req.body);
    res.json(sprint);
  }));

  app.delete('/api/sprints/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteSprint(id);
    res.status(204).send();
  }));

  // Sprint metrics for agile visualizations - using real historical data
  app.get('/api/sprints/:id/metrics', isAuthenticated, asyncHandler(async (req, res) => {
    const sprintId = parseInt(req.params.id);
    const sprint = await storage.getSprint(sprintId);
    
    if (!sprint) {
      throw createError.notFound("Sprint not found");
    }
    
    const tasks = await storage.getTasks(sprint.projectId);
    const sprintTasks = tasks.filter(t => t.sprintId === sprintId);
    
    // Calculate current metrics
    const totalStoryPoints = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedStoryPoints = sprintTasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    
    // Calculate sprint duration
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const now = new Date();
    const currentDate = now < endDate ? now : endDate;
    const durationMs = endDate.getTime() - startDate.getTime();
    const days = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
    
    // Guard against invalid sprint duration
    if (durationMs <= 0) {
      throw createError.badRequest("Sprint end date must be after start date");
    }
    
    // Get historical data for the sprint
    const history = await storage.getSprintHistory(sprintId, startDate, endDate);
    
    // Also get ALL task history to track sprint membership changes
    const allTaskHistory = [];
    for (const task of sprintTasks) {
      const taskHistory = await storage.getTaskHistory(task.id);
      allTaskHistory.push(...taskHistory);
    }
    
    // Generate burndown data from actual historical changes
    const burndownData = [];
    const cfdData = [];
    
    // Build a map of which tasks are in the sprint on each day
    const sprintTasksByDay = new Map<string, Set<number>>();
    const taskStatesByDay = new Map<string, Map<number, { status: string; storyPoints: number }>>();
    
    // Calculate how many days to process (stop at today if sprint is ongoing)
    const effectiveDays = currentDate < endDate ? 
      Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 
      days;
    
    // Process each day in the sprint (up to today)
    for (let i = 0; i <= effectiveDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Determine which tasks are in the sprint on this day
      const tasksInSprintToday = new Set<number>();
      const taskStatesForDay = new Map<number, { status: string; storyPoints: number }>();
      
      // Start with previous day's state
      if (i > 0) {
        const prevDateStr = burndownData[i - 1]?.date;
        const prevTasks = sprintTasksByDay.get(prevDateStr) || new Set();
        const prevStates = taskStatesByDay.get(prevDateStr) || new Map();
        
        prevTasks.forEach(taskId => tasksInSprintToday.add(taskId));
        prevStates.forEach((state, taskId) => {
          taskStatesForDay.set(taskId, { ...state });
        });
      }
      
      // Apply historical changes for this specific day
      const changesForDay = allTaskHistory.filter(h => {
        const changeDate = new Date(h.changedAt);
        return changeDate.toISOString().split('T')[0] === dateStr;
      });
      
      // Process changes for this day
      changesForDay.forEach(change => {
        // Handle sprint membership changes
        if (change.fieldName === 'sprintId') {
          const newSprintId = change.newValue ? JSON.parse(change.newValue) : null;
          const oldSprintId = change.oldValue ? JSON.parse(change.oldValue) : null;
          
          if (newSprintId === sprintId) {
            // Task joined this sprint
            tasksInSprintToday.add(change.taskId);
            // Initialize state if not present
            if (!taskStatesForDay.has(change.taskId)) {
              const task = sprintTasks.find(t => t.id === change.taskId);
              if (task) {
                taskStatesForDay.set(change.taskId, {
                  status: task.status || 'todo',
                  storyPoints: task.storyPoints || 0
                });
              }
            }
          } else if (oldSprintId === sprintId && newSprintId !== sprintId) {
            // Task left this sprint
            tasksInSprintToday.delete(change.taskId);
            taskStatesForDay.delete(change.taskId);
          }
        }
        
        // Update task state if it's in the sprint
        if (tasksInSprintToday.has(change.taskId) || change.sprintId === sprintId) {
          const currentState = taskStatesForDay.get(change.taskId) || { status: 'todo', storyPoints: 0 };
          
          if (change.fieldName === 'status' && change.newValue) {
            currentState.status = JSON.parse(change.newValue);
          }
          if (change.fieldName === 'storyPoints' && change.newValue) {
            currentState.storyPoints = JSON.parse(change.newValue) || 0;
          }
          
          taskStatesForDay.set(change.taskId, currentState);
        }
      });
      
      // If it's day 0 and we have no historical data, use current tasks
      if (i === 0 && tasksInSprintToday.size === 0) {
        sprintTasks.forEach(task => {
          tasksInSprintToday.add(task.id);
          taskStatesForDay.set(task.id, {
            status: 'todo',  // Reasonable default for sprint start
            storyPoints: task.storyPoints || 0
          });
        });
      }
      
      // Store the state for this day
      sprintTasksByDay.set(dateStr, tasksInSprintToday);
      taskStatesByDay.set(dateStr, taskStatesForDay);
      
      // Calculate metrics for this day
      let totalPointsInSprint = 0;
      let remainingPoints = 0;
      const statusCounts = { todo: 0, in_progress: 0, review: 0, done: 0, blocked: 0 };
      
      taskStatesForDay.forEach(state => {
        totalPointsInSprint += state.storyPoints;
        if (state.status !== 'done') {
          remainingPoints += state.storyPoints;
        }
        
        // Count tasks by status
        const mappedStatus = state.status === 'in_progress' ? 'in_progress' : state.status;
        if (mappedStatus in statusCounts) {
          statusCounts[mappedStatus as keyof typeof statusCounts]++;
        }
      });
      
      // Calculate ideal burndown (linear from initial scope)
      const progress = i / days;
      const ideal = totalStoryPoints * (1 - progress);
      
      burndownData.push({
        date: dateStr,
        ideal: Math.max(0, Math.round(ideal * 10) / 10),
        actual: Math.max(0, Math.round(remainingPoints * 10) / 10),
      });
      
      // Add CFD data
      cfdData.push({
        date: dateStr,
        todo: statusCounts.todo,
        inProgress: statusCounts.in_progress,
        review: statusCounts.review,
        done: statusCounts.done,
      });
    }
    
    // If we don't have enough historical data, fill in with current state
    if (burndownData.length === 0 || (burndownData[burndownData.length - 1]?.actual === 0 && totalStoryPoints > 0)) {
      // Fallback to simulated data if no history exists
      for (let i = 0; i <= days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Skip if we already have data for this day
        if (burndownData.some(d => d.date === dateStr)) continue;
        
        const progress = i / days;
        const ideal = totalStoryPoints * (1 - progress);
        const actual = i === 0 ? totalStoryPoints : (i === days ? totalStoryPoints - completedStoryPoints : totalStoryPoints);
        
        burndownData.push({
          date: dateStr,
          ideal: Math.max(0, Math.round(ideal * 10) / 10),
          actual: Math.max(0, Math.round(actual * 10) / 10),
        });
      }
      
      // Fill CFD with current counts if no history
      if (cfdData.length === 0) {
        const currentCounts = {
          todo: sprintTasks.filter(t => t.status === 'todo').length,
          inProgress: sprintTasks.filter(t => t.status === 'in_progress').length,
          review: sprintTasks.filter(t => t.status === 'review').length,
          done: sprintTasks.filter(t => t.status === 'done').length,
        };
        
        for (let i = 0; i <= days; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          cfdData.push({
            date: dateStr,
            todo: i === 0 ? sprintTasks.length : currentCounts.todo,
            inProgress: i === 0 ? 0 : currentCounts.inProgress,
            review: i === 0 ? 0 : currentCounts.review,
            done: i === days ? currentCounts.done : 0,
          });
        }
      }
    }
    
    res.json({
      sprint,
      totalStoryPoints,
      completedStoryPoints,
      totalTasks: sprintTasks.length,
      completedTasks: sprintTasks.filter(t => t.status === 'done').length,
      burndownData,
      cfdData,
    });
  }));

  // ============= TASK ROUTES =============
  
  app.get('/api/tasks', isAuthenticated, asyncHandler(async (req, res) => {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    const searchQuery = req.query.searchQuery as string | undefined;
    const tasks = await storage.getTasks(projectId, searchQuery);
    res.json(tasks);
  }));

  app.get('/api/tasks/:id/subtasks', isAuthenticated, asyncHandler(async (req, res) => {
    const parentId = parseInt(req.params.id);
    const subtasks = await storage.getSubtasks(parentId);
    res.json(subtasks);
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

  app.patch('/api/tasks/:id', isAuthenticated, asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    const userId = req.user.claims.sub;
    
    // Validate input with partial schema (allows updating only some fields)
    const validatedData = insertTaskSchema.partial().parse(req.body);
    
    // Convert date strings to Date objects if present (after validation)
    if (validatedData.startDate && typeof validatedData.startDate === 'string') {
      validatedData.startDate = new Date(validatedData.startDate);
    }
    if (validatedData.dueDate && typeof validatedData.dueDate === 'string') {
      validatedData.dueDate = new Date(validatedData.dueDate);
    }
    
    // Get the current task to check for date changes
    const currentTask = await storage.getTask(id);
    if (!currentTask) {
      throw createError.notFound("Task not found");
    }
    
    // Check if dates are being updated
    const datesChanged = (
      (validatedData.startDate && validatedData.startDate.getTime() !== currentTask.startDate?.getTime()) ||
      (validatedData.dueDate && validatedData.dueDate.getTime() !== currentTask.dueDate?.getTime())
    );
    
    // Use new dates if provided, otherwise use current task dates
    const effectiveStartDate = validatedData.startDate || currentTask.startDate;
    const effectiveDueDate = validatedData.dueDate || currentTask.dueDate;
    
    if (datesChanged && currentTask.projectId && effectiveStartDate && effectiveDueDate) {
      // Get all tasks and dependencies for the project
      const projectTasks = await storage.getTasks(currentTask.projectId);
      const dependencies = await storage.getProjectDependencies(currentTask.projectId);
      
      // Create scheduling engine
      const scheduler = new SchedulingEngine(projectTasks, dependencies);
      
      // Validate the date change doesn't violate dependencies
      const violations = scheduler.validateTaskDateChange(id, effectiveStartDate, effectiveDueDate);
      
      if (violations.length > 0) {
        throw createError.badRequest(`Dependency violations: ${violations.map(v => v.message).join('; ')}`);
      }
      
      // Cascade the schedule update to dependent tasks
      const updatedTasks = scheduler.cascadeScheduleUpdate(id, effectiveStartDate, effectiveDueDate);
      
      // Calculate critical path
      const criticalPath = scheduler.calculateCriticalPath();
      const allUpdatedTasks = scheduler.getUpdatedTasks();
      
      // Update all affected tasks in the database
      for (const task of allUpdatedTasks) {
        await storage.updateTask(task.id, {
          startDate: task.startDate || undefined,
          dueDate: task.dueDate || undefined,
          isOnCriticalPath: task.isOnCriticalPath,
        }, userId);
      }
      
      // Return the main updated task with metadata about cascaded updates
      const mainTask = await storage.getTask(id);
      res.json({
        task: mainTask,
        cascadedUpdates: updatedTasks.filter(t => t.id !== id),
        criticalPath,
      });
    } else {
      // No date changes, just update normally
      const task = await storage.updateTask(id, validatedData, userId);
      res.json({ task });
    }
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

  // Validate task date change against dependencies
  app.post('/api/tasks/:id/validate-dates', isAuthenticated, asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.id);
    const { startDate: startDateStr, dueDate: dueDateStr } = req.body;
    
    if (!startDateStr || !dueDateStr) {
      throw createError.badRequest("Both startDate and dueDate are required");
    }
    
    const startDate = new Date(startDateStr);
    const dueDate = new Date(dueDateStr);
    
    const task = await storage.getTask(taskId);
    if (!task) {
      throw createError.notFound("Task not found");
    }
    
    if (!task.projectId) {
      return res.json({ valid: true, violations: [] });
    }
    
    // Get all tasks and dependencies for the project
    const projectTasks = await storage.getTasks(task.projectId);
    const dependencies = await storage.getProjectDependencies(task.projectId);
    
    // Create scheduling engine and validate
    const scheduler = new SchedulingEngine(projectTasks, dependencies);
    const violations = scheduler.validateTaskDateChange(taskId, startDate, dueDate);
    
    res.json({
      valid: violations.length === 0,
      violations,
    });
  }));

  // Calculate and return critical path for a project
  app.get('/api/projects/:projectId/critical-path', isAuthenticated, asyncHandler(async (req: any, res) => {
    const projectId = parseInt(req.params.projectId);
    const userId = req.user.claims.sub;
    
    const tasks = await storage.getTasks(projectId);
    const dependencies = await storage.getProjectDependencies(projectId);
    
    const scheduler = new SchedulingEngine(tasks, dependencies);
    const criticalPath = scheduler.calculateCriticalPath();
    const updatedTasks = scheduler.getUpdatedTasks();
    
    // Update critical path flags in database
    for (const task of updatedTasks) {
      if (task.isOnCriticalPath !== tasks.find(t => t.id === task.id)?.isOnCriticalPath) {
        await storage.updateTask(task.id, { isOnCriticalPath: task.isOnCriticalPath }, userId);
      }
    }
    
    res.json({
      criticalPath,
      criticalTasks: updatedTasks.filter(t => t.isOnCriticalPath),
    });
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

  app.delete('/api/custom-fields/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteCustomField(id);
    res.status(204).send();
  }));

  // ============= TASK CUSTOM FIELD VALUE ROUTES =============

  app.get('/api/tasks/:taskId/custom-field-values', isAuthenticated, asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const values = await storage.getTaskCustomFieldValues(taskId);
    res.json(values);
  }));

  app.put('/api/tasks/:taskId/custom-field-values/:fieldId', isAuthenticated, asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const customFieldId = parseInt(req.params.fieldId);
    const { value } = req.body;
    const result = await storage.setTaskCustomFieldValue(taskId, customFieldId, value);
    res.json(result);
  }));

  app.put('/api/tasks/:taskId/custom-field-values/batch', isAuthenticated, asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const { values } = req.body;
    
    console.log('Batch endpoint received:', JSON.stringify(req.body));
    console.log('Values array:', JSON.stringify(values));
    
    if (!Array.isArray(values)) {
      throw createError.badRequest("Values must be an array");
    }
    
    const formattedValues = values.map((v, index) => {
      console.log(`Processing value[${index}]:`, JSON.stringify(v));
      const fieldId = parseInt(v.customFieldId);
      console.log(`Parsed customFieldId "${v.customFieldId}" as ${fieldId}`);
      
      if (isNaN(fieldId)) {
        console.error(`Failed to parse customFieldId at index ${index}:`, v.customFieldId);
        throw createError.badRequest(`Invalid customFieldId at index ${index}: "${v.customFieldId}" (type: ${typeof v.customFieldId})`);
      }
      return {
        customFieldId: fieldId,
        value: v.value
      };
    });
    
    console.log('Formatted values for storage:', JSON.stringify(formattedValues));
    const results = await storage.setTaskCustomFieldValuesBatch(taskId, formattedValues);
    res.json(results);
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
    let fileBuffer: Buffer = downloadResult.value as any;
    
    // Convert to Buffer if it's not already one
    if (!Buffer.isBuffer(fileBuffer)) {
      if (fileBuffer && typeof fileBuffer === 'object' && (fileBuffer as any).type === 'Buffer' && Array.isArray((fileBuffer as any).data)) {
        // It's a JSON-encoded Buffer, convert it back
        fileBuffer = Buffer.from((fileBuffer as any).data);
      } else if (Array.isArray(fileBuffer)) {
        // It's an array of bytes
        fileBuffer = Buffer.from(fileBuffer as any);
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
    
    // Fetch project data for context
    const project = await storage.getProject(projectId);
    if (!project) {
      throw createError.notFound("Project not found");
    }
    
    // Fetch tasks for the project
    const tasks = await storage.getTasks(projectId);
    
    // Pass both tasks and project data to get enriched predictions
    const prediction = await predictProjectDeadline(tasks, project);
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
    const { sendProjectReport, sendPortfolioSummary } = await import('./outlook');
    const { projectId, reportType, recipients } = req.body;
    
    if (!reportType || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw createError.badRequest("reportType and recipients array are required");
    }

    // Check if this is a portfolio summary (all active projects)
    if (reportType === 'summary' && (!projectId || projectId === 'all')) {
      // Fetch all active projects
      const allProjects = await storage.getProjects();
      const activeProjects = allProjects.filter(p => p.status === 'active');
      
      if (activeProjects.length === 0) {
        throw createError.notFound("No active projects found");
      }

      // Fetch all users to map manager IDs to names
      const allUsers = await storage.getAllUsers();
      const userMap = new Map(allUsers.map((u: User) => [u.id, u]));

      // Collect data for each active project
      const projectsData = await Promise.all(
        activeProjects.map(async (project) => {
          const tasks = await storage.getTasks(project.id);
          const totalTasks = tasks.length;
          const completedTasks = tasks.filter(t => t.status === 'done').length;
          const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
          const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          
          // Get manager name
          const manager = project.managerId ? userMap.get(project.managerId) : null;
          const managerName = manager 
            ? `${manager.firstName || ''} ${manager.lastName || ''}`.trim() || manager.email || 'N/A'
            : 'N/A';
          
          return {
            id: project.id,
            name: project.name,
            description: project.description,
            status: project.status,
            manager: managerName,
            startDate: project.startDate,
            endDate: project.endDate,
            budget: project.budget,
            totalTasks,
            completedTasks,
            inProgressTasks,
            progress
          };
        })
      );

      await sendPortfolioSummary(projectsData, recipients);
      
      res.json({ 
        message: "Portfolio summary sent successfully",
        recipientCount: recipients.length,
        projectCount: activeProjects.length
      });
      return;
    }

    // Single project report (original functionality)
    if (!projectId) {
      throw createError.badRequest("projectId is required for non-portfolio reports");
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

  // ============= RECURRING TASK ROUTES =============
  
  app.get('/api/tasks/:id/next-occurrence', isAuthenticated, asyncHandler(async (req, res) => {
    const { getNextOccurrence } = await import('./recurrence');
    const id = parseInt(req.params.id);
    const task = await storage.getTask(id);
    
    if (!task) {
      throw createError.notFound("Task not found");
    }
    
    const nextOccurrence = getNextOccurrence(task);
    res.json({ nextOccurrence });
  }));

  app.get('/api/recurring/tasks', isAuthenticated, asyncHandler(async (req, res) => {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    const tasks = await storage.getTasks(projectId);
    const recurringTasks = tasks.filter(task => task.recurrenceType);
    res.json(recurringTasks);
  }));

  app.post('/api/recurring/process', isAuthenticated, asyncHandler(async (req, res) => {
    const { processAllRecurringTasks } = await import('./recurrence');
    const generatedTasks = await processAllRecurringTasks();
    res.json({ 
      message: `Processed recurring tasks, generated ${generatedTasks.length} new instances`,
      generatedTasks 
    });
  }));

  app.post('/api/recurring/process-task/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const { processRecurringTask } = await import('./recurrence');
    const id = parseInt(req.params.id);
    const task = await storage.getTask(id);
    
    if (!task) {
      throw createError.notFound("Task not found");
    }
    
    const newTasks = await processRecurringTask(task);
    
    if (newTasks.length === 0) {
      res.json({ message: "No new instances needed at this time" });
    } else {
      res.json({ 
        message: `Generated ${newTasks.length} task instance(s)`, 
        generatedTasks: newTasks 
      });
    }
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
