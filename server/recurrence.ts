import { storage } from "./storage";
import type { Task, InsertTask } from "@shared/schema";

/**
 * Calculate the next occurrence date based on recurrence type and interval
 */
export function calculateNextOccurrence(
  currentDate: Date,
  recurrenceType: 'daily' | 'weekly' | 'monthly' | 'custom',
  recurrenceInterval?: number
): Date {
  const nextDate = new Date(currentDate);
  
  switch (recurrenceType) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'custom':
      if (recurrenceInterval && recurrenceInterval > 0) {
        nextDate.setDate(nextDate.getDate() + recurrenceInterval);
      } else {
        // Default to daily if no valid interval
        nextDate.setDate(nextDate.getDate() + 1);
      }
      break;
  }
  
  return nextDate;
}

/**
 * Generate a new task instance from a recurring task template
 */
export async function generateTaskInstance(
  templateTask: Task,
  newStartDate: Date,
  newDueDate: Date
): Promise<Task> {
  const taskData: InsertTask = {
    projectId: templateTask.projectId,
    sprintId: templateTask.sprintId ?? undefined,
    parentId: templateTask.parentId ?? undefined,
    title: templateTask.title,
    description: templateTask.description ?? undefined,
    assigneeId: templateTask.assigneeId ?? undefined,
    status: 'todo', // Always start new instances as todo
    priority: templateTask.priority,
    startDate: newStartDate,
    dueDate: newDueDate,
    duration: templateTask.duration ?? undefined,
    progress: 0, // Reset progress for new instance
    estimatedHours: templateTask.estimatedHours ?? undefined,
    storyPoints: templateTask.storyPoints ?? undefined,
    isMilestone: templateTask.isMilestone,
    isOnCriticalPath: false,
    // Don't copy recurrence settings to generated instances
    recurrenceType: undefined,
    recurrenceInterval: undefined,
    recurrenceEndDate: undefined,
    sortOrder: templateTask.sortOrder,
  };

  const newTask = await storage.createTask(taskData);
  return newTask;
}

/**
 * Check if a recurring task needs new instances and create them
 * This will create ALL missed instances in a single run to catch up on backlogs
 */
export async function processRecurringTask(task: Task): Promise<Task[]> {
  // Only process tasks with recurrence configured
  if (!task.recurrenceType || !task.dueDate) {
    return [];
  }

  const now = new Date();
  const generatedTasks: Task[] = [];
  
  // Work with mutable copies of the dates
  let currentStartDate = task.startDate ? new Date(task.startDate) : null;
  let currentDueDate = new Date(task.dueDate);
  
  // Check if recurrence has ended globally
  if (task.recurrenceEndDate) {
    const endDate = new Date(task.recurrenceEndDate);
    if (now >= endDate) {
      return []; // Recurrence period has ended
    }
  }

  // Loop to catch up on all missed occurrences
  while (currentDueDate <= now) {
    // Calculate next occurrence dates
    const nextStartDate = currentStartDate 
      ? calculateNextOccurrence(currentStartDate, task.recurrenceType, task.recurrenceInterval ?? undefined)
      : calculateNextOccurrence(currentDueDate, task.recurrenceType, task.recurrenceInterval ?? undefined);
    
    const nextDueDate = calculateNextOccurrence(currentDueDate, task.recurrenceType, task.recurrenceInterval ?? undefined);

    // Check if next due date would exceed recurrence end date
    if (task.recurrenceEndDate) {
      const endDate = new Date(task.recurrenceEndDate);
      if (nextDueDate > endDate) {
        break; // Next instance would be beyond recurrence end date
      }
    }

    // Generate the new task instance
    const newTask = await generateTaskInstance(task, nextStartDate, nextDueDate);
    generatedTasks.push(newTask);
    
    // Move to next iteration
    currentStartDate = nextStartDate;
    currentDueDate = nextDueDate;
  }

  // If we generated any tasks, update the template task's dates to the next future occurrence
  if (generatedTasks.length > 0) {
    await storage.updateTask(task.id, {
      startDate: currentStartDate ?? undefined,
      dueDate: currentDueDate,
    }, 'system');
  }

  return generatedTasks;
}

/**
 * Process all recurring tasks in the system
 */
export async function processAllRecurringTasks(): Promise<Task[]> {
  // Get all tasks (we'll filter for recurring ones)
  const allTasks = await storage.getTasks();
  
  const recurringTasks = allTasks.filter(task => 
    task.recurrenceType && task.dueDate
  );

  const generatedTasks: Task[] = [];

  for (const task of recurringTasks) {
    try {
      const newTasks = await processRecurringTask(task);
      if (newTasks.length > 0) {
        generatedTasks.push(...newTasks);
        console.log(`[Recurrence] Generated ${newTasks.length} instance(s) for task ${task.id}: "${task.title}"`);
      }
    } catch (error) {
      console.error(`[Recurrence] Error processing recurring task ${task.id}:`, error);
    }
  }

  return generatedTasks;
}

/**
 * Get the next scheduled occurrence for a recurring task
 */
export function getNextOccurrence(task: Task): Date | null {
  if (!task.recurrenceType || !task.dueDate) {
    return null;
  }

  const nextDate = calculateNextOccurrence(
    new Date(task.dueDate),
    task.recurrenceType,
    task.recurrenceInterval ?? undefined
  );

  // Check if it would exceed recurrence end date
  if (task.recurrenceEndDate && nextDate > new Date(task.recurrenceEndDate)) {
    return null;
  }

  return nextDate;
}
