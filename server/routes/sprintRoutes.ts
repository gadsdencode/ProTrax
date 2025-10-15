import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { asyncHandler, createError } from "../errorHandler";
import { insertSprintSchema } from "@shared/schema";

const router = Router();

// Get all sprints
router.get('/', isAuthenticated, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.query.projectId as string);
  const sprints = await storage.getSprints(projectId);
  res.json(sprints);
}));

// Get single sprint
router.get('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const sprint = await storage.getSprint(id);
  if (!sprint) {
    throw createError.notFound("Sprint not found");
  }
  res.json(sprint);
}));

// Create sprint
router.post('/', isAuthenticated, asyncHandler(async (req, res) => {
  const data = insertSprintSchema.parse(req.body);
  const sprint = await storage.createSprint(data);
  res.status(201).json(sprint);
}));

// Update sprint
router.patch('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const sprint = await storage.updateSprint(id, req.body);
  res.json(sprint);
}));

// Delete sprint
router.delete('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  await storage.deleteSprint(id);
  res.status(204).send();
}));

// Sprint metrics for agile visualizations - using real historical data
router.get('/:id/metrics', isAuthenticated, asyncHandler(async (req, res) => {
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

export default router;