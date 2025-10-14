import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler, createError } from "../errorHandler";
import { insertTaskDependencySchema } from "@shared/schema";
import { SchedulingEngine } from "../scheduling";

const router = Router();

// Get task dependencies
router.get('/tasks/:taskId/dependencies', isAuthenticated, asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const dependencies = await storage.getTaskDependencies(taskId);
  res.json(dependencies);
}));

// Create task dependency
router.post('/', isAuthenticated, asyncHandler(async (req, res) => {
  const data = insertTaskDependencySchema.parse(req.body);
  const dependency = await storage.createTaskDependency(data);
  res.status(201).json(dependency);
}));

// Calculate and return critical path for a project
router.get('/projects/:projectId/critical-path', isAuthenticated, asyncHandler(async (req: any, res) => {
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

export default router;