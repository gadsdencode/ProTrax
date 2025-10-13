import { processAllRecurringTasks } from './recurrence';

let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Start the recurring task scheduler
 * By default, checks for recurring tasks every hour
 */
export function startRecurringTaskScheduler(intervalMinutes: number = 60) {
  // Clear existing interval if any
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  const intervalMs = intervalMinutes * 60 * 1000;
  
  console.log(`[Scheduler] Starting recurring task scheduler (interval: ${intervalMinutes} minutes)`);
  
  // Run immediately on startup
  processRecurringTasksJob();
  
  // Then run on interval
  schedulerInterval = setInterval(() => {
    processRecurringTasksJob();
  }, intervalMs);
}

/**
 * Stop the recurring task scheduler
 */
export function stopRecurringTaskScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Stopped recurring task scheduler');
  }
}

/**
 * The actual job that processes recurring tasks
 */
async function processRecurringTasksJob() {
  try {
    console.log('[Scheduler] Running recurring task processing job...');
    const generatedTasks = await processAllRecurringTasks();
    
    if (generatedTasks.length > 0) {
      console.log(`[Scheduler] Generated ${generatedTasks.length} new task instances`);
      generatedTasks.forEach(task => {
        console.log(`  - Created: "${task.title}" (ID: ${task.id})`);
      });
    } else {
      console.log('[Scheduler] No new task instances needed at this time');
    }
  } catch (error) {
    console.error('[Scheduler] Error processing recurring tasks:', error);
  }
}
