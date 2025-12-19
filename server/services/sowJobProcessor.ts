/**
 * SOW Job Processor - Background processor for SOW document extraction
 * 
 * Handles the async processing of Statement of Work documents:
 * 1. Extracts project data using Gemini API
 * 2. Creates project and tasks in the database
 * 3. Reports progress and results back to the job queue
 */

import { AsyncJob } from '../db/schema';
import { storage } from '../storage';
import { extractProjectDataFromSOW } from '../gemini';
import { insertProjectSchema } from '@shared/schema';
import { 
  jobQueueService, 
  SOWExtractionInput, 
  SOWExtractionResult 
} from './jobQueueService';

/**
 * Process a SOW extraction job
 * Called by the JobQueueService when a sow_extraction job is picked up
 */
export async function processSOWExtractionJob(job: AsyncJob): Promise<void> {
  const input = job.inputData as unknown as SOWExtractionInput;
  
  if (!input?.textContent) {
    throw new Error('Job input data is missing text content');
  }

  const jobId = job.id;
  const userId = job.userId;

  console.log(`[SOW Job ${jobId}] Starting extraction for file: ${input.fileName}`);

  // Step 1: Update progress - Starting Gemini extraction
  await jobQueueService.updateProgress(jobId, 10, 'Analyzing document with AI...');

  // Step 2: Extract project data from SOW using Gemini
  let projectData;
  try {
    console.log(`[SOW Job ${jobId}] Calling Gemini API to extract project data...`);
    projectData = await extractProjectDataFromSOW(input.textContent);
    console.log(`[SOW Job ${jobId}] Gemini API response received`);
    console.log(`[SOW Job ${jobId}] Extracted: ${projectData.name}, ${projectData.tasks?.length || 0} tasks`);
  } catch (error: any) {
    console.error(`[SOW Job ${jobId}] Gemini extraction failed:`, error);
    throw new Error(`Failed to extract project data: ${error.message}`);
  }

  // Step 3: Update progress - Gemini extraction complete
  await jobQueueService.updateProgress(jobId, 50, `Found project: "${projectData.name}" with ${projectData.tasks?.length || 0} tasks`);

  // Step 4: Validate and prepare project data
  const { tasks, ...projectFields } = projectData;
  console.log(`[SOW Job ${jobId}] Tasks to create: ${tasks?.length || 0}`);

  // Parse project data with schema validation
  let validatedProjectData;
  try {
    validatedProjectData = insertProjectSchema.parse({ 
      ...projectFields, 
      managerId: userId,
      status: 'planning'
    });
  } catch (error: any) {
    console.error(`[SOW Job ${jobId}] Project validation failed:`, error);
    throw new Error(`Project data validation failed: ${error.message}`);
  }

  // Step 5: Update progress - Creating project
  await jobQueueService.updateProgress(jobId, 70, 'Creating project and tasks...');

  // Step 6: Create project and tasks
  try {
    console.log(`[SOW Job ${jobId}] Creating project: ${validatedProjectData.name}`);
    
    const result = await storage.createProjectWithTasks(validatedProjectData, tasks || []);
    const { project, tasks: createdTasks, failedTasks } = result;
    
    console.log(`[SOW Job ${jobId}] Project created with ID: ${project.id}`);
    console.log(`[SOW Job ${jobId}] Task results: ${createdTasks.length} created, ${failedTasks.length} failed`);

    // Log failures for debugging
    if (failedTasks.length > 0) {
      console.warn(`[SOW Job ${jobId}] Failed tasks:`);
      failedTasks.forEach((ft, index) => {
        console.warn(`  ${index + 1}. "${ft.title}": ${ft.error}`);
      });
    }

    // Step 7: Update progress - Almost done
    await jobQueueService.updateProgress(jobId, 90, 'Finalizing...');

    // Step 8: Build result data
    const resultData: SOWExtractionResult = {
      projectId: project.id,
      projectName: project.name,
      tasksCreated: createdTasks.length,
      tasksFailed: failedTasks.length,
      message: failedTasks.length > 0
        ? `Project created successfully. ${createdTasks.length} tasks saved, ${failedTasks.length} tasks failed.`
        : `Project and all ${createdTasks.length} tasks created successfully.`,
    };

    // Include failure details if any
    if (failedTasks.length > 0) {
      resultData.failedTasks = failedTasks;
    }

    // Step 9: Complete the job
    await jobQueueService.completeJob(jobId, resultData as unknown as Record<string, unknown>);
    
    console.log(`[SOW Job ${jobId}] Job completed successfully`);
    
  } catch (error: any) {
    console.error(`[SOW Job ${jobId}] Failed to create project:`, error);
    throw new Error(`Failed to create project: ${error.message}`);
  }
}

/**
 * Register the SOW processor with the JobQueueService
 */
export function registerSOWProcessor(): void {
  jobQueueService.registerProcessor('sow_extraction', processSOWExtractionJob);
  console.log('[SOW Processor] Registered with JobQueueService');
}

