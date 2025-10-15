import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { asyncHandler, createError } from "../errorHandler";
import { insertTaskSchema } from "@shared/schema";
import { SchedulingEngine } from "../scheduling";

const router = Router();

// Get all tasks
router.get('/', isAuthenticated, asyncHandler(async (req, res) => {
  const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
  const searchQuery = req.query.searchQuery as string | undefined;
  const tasks = await storage.getTasks(projectId, searchQuery);
  res.json(tasks);
}));

// Get my tasks (must be before /:id to avoid route conflicts)
router.get('/my-tasks', isAuthenticated, asyncHandler(async (req: any, res) => {
  const userId = req.user.id;
  const tasks = await storage.getMyTasks(userId);
  res.json(tasks);
}));

// Get subtasks
router.get('/:id/subtasks', isAuthenticated, asyncHandler(async (req, res) => {
  const parentId = parseInt(req.params.id);
  const subtasks = await storage.getSubtasks(parentId);
  res.json(subtasks);
}));

// Get single task
router.get('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const task = await storage.getTask(id);
  if (!task) {
    throw createError.notFound("Task not found");
  }
  res.json(task);
}));

// Create task
router.post('/', isAuthenticated, asyncHandler(async (req, res) => {
  const data = insertTaskSchema.parse(req.body);
  const task = await storage.createTask(data);
  res.status(201).json(task);
}));

// Update task
router.patch('/:id', isAuthenticated, asyncHandler(async (req: any, res) => {
  const id = parseInt(req.params.id);
  const userId = req.user.id;
  
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

// Delete task
router.delete('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  await storage.deleteTask(id);
  res.status(204).send();
}));

// Get task comments
router.get('/:taskId/comments', isAuthenticated, asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const comments = await storage.getComments(taskId);
  res.json(comments);
}));

// Get task dependencies
router.get('/:taskId/dependencies', isAuthenticated, asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const dependencies = await storage.getTaskDependencies(taskId);
  res.json(dependencies);
}));

// Get time entries for task
router.get('/:taskId/time-entries', isAuthenticated, asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const entries = await storage.getTimeEntries(taskId);
  res.json(entries);
}));

// Get task custom field values
router.get('/:taskId/custom-field-values', isAuthenticated, asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const values = await storage.getTaskCustomFieldValues(taskId);
  res.json(values);
}));

// Set single custom field value
router.put('/:taskId/custom-field-values/:fieldId', isAuthenticated, asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const customFieldId = parseInt(req.params.fieldId);
  const { value } = req.body;
  const result = await storage.setTaskCustomFieldValue(taskId, customFieldId, value);
  res.json(result);
}));

// Set batch custom field values
router.put('/:taskId/custom-field-values/batch', isAuthenticated, asyncHandler(async (req, res) => {
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

// Validate task date change against dependencies
router.post('/:id/validate-dates', isAuthenticated, asyncHandler(async (req, res) => {
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

export default router;