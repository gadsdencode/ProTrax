import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { asyncHandler, createError } from "../errorHandler";

const router = Router();

// Get next occurrence for a task
router.get('/tasks/:id/next-occurrence', isAuthenticated, asyncHandler(async (req, res) => {
  const { getNextOccurrence } = await import('../recurrence');
  const id = parseInt(req.params.id);
  const task = await storage.getTask(id);
  
  if (!task) {
    throw createError.notFound("Task not found");
  }
  
  const nextOccurrence = getNextOccurrence(task);
  res.json({ nextOccurrence });
}));

// Get all recurring tasks
router.get('/tasks', isAuthenticated, asyncHandler(async (req, res) => {
  const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
  const tasks = await storage.getTasks(projectId);
  const recurringTasks = tasks.filter(task => task.recurrenceType);
  res.json(recurringTasks);
}));

// Process all recurring tasks
router.post('/process', isAuthenticated, asyncHandler(async (req, res) => {
  const { processAllRecurringTasks } = await import('../recurrence');
  const generatedTasks = await processAllRecurringTasks();
  res.json({ 
    message: `Processed recurring tasks, generated ${generatedTasks.length} new instances`,
    generatedTasks 
  });
}));

// Process specific recurring task
router.post('/process-task/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const { processRecurringTask } = await import('../recurrence');
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

export default router;