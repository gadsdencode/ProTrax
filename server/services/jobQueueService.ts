/**
 * JobQueueService - Async Job Processing Service
 * 
 * Provides background processing capabilities for long-running operations
 * like SOW document parsing and Gemini API calls. Jobs are tracked in PostgreSQL
 * and processed asynchronously to prevent request timeouts.
 * 
 * Pattern:
 * 1. Endpoint receives request, creates job record, returns job ID immediately
 * 2. Background processor picks up the job and processes it
 * 3. Client polls for job status until completion
 */

import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db';
import { asyncJobs, AsyncJob } from '../db/schema';

// Job type definitions for type-safe job data
export type AsyncJobType = 'sow_extraction' | 'report_generation' | 'bulk_import';
export type AsyncJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SOWExtractionInput {
  fileName: string;
  fileSize: number;
  mimeType: string;
  textContent: string;
}

export interface SOWExtractionResult {
  projectId: number;
  projectName: string;
  tasksCreated: number;
  tasksFailed: number;
  failedTasks?: Array<{ title: string; error: string }>;
  message: string;
}

export interface JobCreateParams {
  userId: string;
  type: AsyncJobType;
  inputData?: Record<string, unknown>;
}

export interface JobUpdateParams {
  status?: AsyncJobStatus;
  progress?: number;
  progressMessage?: string;
  resultData?: Record<string, unknown>;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

// In-memory job processor registry
type JobProcessor = (job: AsyncJob) => Promise<void>;
const jobProcessors = new Map<AsyncJobType, JobProcessor>();

// Track jobs currently being processed to prevent duplicate processing
const processingJobs = new Set<string>();

/**
 * JobQueueService - Manages async job lifecycle
 */
export class JobQueueService {
  private static instance: JobQueueService;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): JobQueueService {
    if (!JobQueueService.instance) {
      JobQueueService.instance = new JobQueueService();
    }
    return JobQueueService.instance;
  }

  /**
   * Register a processor function for a specific job type
   */
  registerProcessor(type: AsyncJobType, processor: JobProcessor): void {
    jobProcessors.set(type, processor);
    console.log(`[JobQueue] Registered processor for job type: ${type}`);
  }

  /**
   * Create a new job and return its ID immediately
   */
  async createJob(params: JobCreateParams): Promise<string> {
    const [job] = await db.insert(asyncJobs).values({
      userId: params.userId,
      type: params.type,
      status: 'pending',
      progress: 0,
      inputData: params.inputData ?? null,
    }).returning();

    console.log(`[JobQueue] Created job ${job.id} (type: ${params.type}) for user ${params.userId}`);
    
    // Trigger immediate processing attempt
    this.processNextJob();
    
    return job.id;
  }

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<AsyncJob | null> {
    const [job] = await db.select().from(asyncJobs).where(eq(asyncJobs.id, jobId)).limit(1);
    return job ?? null;
  }

  /**
   * Get a job by ID for a specific user (security check)
   */
  async getJobForUser(jobId: string, userId: string): Promise<AsyncJob | null> {
    const [job] = await db.select().from(asyncJobs)
      .where(and(eq(asyncJobs.id, jobId), eq(asyncJobs.userId, userId)))
      .limit(1);
    return job ?? null;
  }

  /**
   * Update job status and metadata
   */
  async updateJob(jobId: string, updates: JobUpdateParams): Promise<AsyncJob | null> {
    const [updatedJob] = await db.update(asyncJobs)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(asyncJobs.id, jobId))
      .returning();
    
    return updatedJob ?? null;
  }

  /**
   * Mark a job as started (processing)
   */
  async startJob(jobId: string): Promise<AsyncJob | null> {
    return this.updateJob(jobId, {
      status: 'processing',
      startedAt: new Date(),
      progressMessage: 'Processing started...',
    });
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: number, message?: string): Promise<void> {
    await this.updateJob(jobId, {
      progress: Math.min(100, Math.max(0, progress)),
      progressMessage: message,
    });
  }

  /**
   * Mark a job as completed with result data
   */
  async completeJob(jobId: string, resultData: Record<string, unknown>): Promise<AsyncJob | null> {
    return this.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      progressMessage: 'Completed successfully',
      resultData,
      completedAt: new Date(),
    });
  }

  /**
   * Mark a job as failed with error details
   */
  async failJob(jobId: string, errorMessage: string): Promise<AsyncJob | null> {
    return this.updateJob(jobId, {
      status: 'failed',
      progressMessage: 'Job failed',
      errorMessage,
      completedAt: new Date(),
    });
  }

  /**
   * Get pending jobs for processing
   */
  async getPendingJobs(limit: number = 5): Promise<AsyncJob[]> {
    return db.select().from(asyncJobs)
      .where(eq(asyncJobs.status, 'pending'))
      .orderBy(asyncJobs.createdAt)
      .limit(limit);
  }

  /**
   * Get recent jobs for a user
   */
  async getUserJobs(userId: string, limit: number = 10): Promise<AsyncJob[]> {
    return db.select().from(asyncJobs)
      .where(eq(asyncJobs.userId, userId))
      .orderBy(sql`${asyncJobs.createdAt} DESC`)
      .limit(limit);
  }

  /**
   * Process the next pending job
   */
  async processNextJob(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      const pendingJobs = await this.getPendingJobs(1);
      
      for (const job of pendingJobs) {
        // Skip if already being processed
        if (processingJobs.has(job.id)) continue;
        
        const processor = jobProcessors.get(job.type as AsyncJobType);
        if (!processor) {
          console.error(`[JobQueue] No processor registered for job type: ${job.type}`);
          await this.failJob(job.id, `No processor registered for job type: ${job.type}`);
          continue;
        }

        // Mark as being processed
        processingJobs.add(job.id);
        
        // Process job in background (don't await)
        this.executeJob(job, processor).finally(() => {
          processingJobs.delete(job.id);
        });
      }
    } catch (error) {
      console.error('[JobQueue] Error in processNextJob:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a job with its processor
   */
  private async executeJob(job: AsyncJob, processor: JobProcessor): Promise<void> {
    console.log(`[JobQueue] Starting job ${job.id} (type: ${job.type})`);
    
    try {
      await this.startJob(job.id);
      await processor(job);
      console.log(`[JobQueue] Job ${job.id} completed successfully`);
    } catch (error: any) {
      console.error(`[JobQueue] Job ${job.id} failed:`, error);
      await this.failJob(job.id, error.message || 'Unknown error occurred');
    }
  }

  /**
   * Start the background job processor
   * Polls for pending jobs at regular intervals
   */
  startProcessor(intervalMs: number = 5000): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    console.log(`[JobQueue] Starting job processor (interval: ${intervalMs}ms)`);
    
    // Process immediately on start
    this.processNextJob();
    
    // Then poll at interval
    this.processingInterval = setInterval(() => {
      this.processNextJob();
    }, intervalMs);
  }

  /**
   * Stop the background job processor
   */
  stopProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('[JobQueue] Stopped job processor');
    }
  }

  /**
   * Clean up old completed/failed jobs (older than specified days)
   */
  async cleanupOldJobs(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const result = await db.delete(asyncJobs)
      .where(
        and(
          sql`${asyncJobs.status} IN ('completed', 'failed')`,
          sql`${asyncJobs.createdAt} < ${cutoffDate}`
        )
      );
    
    // Note: Drizzle doesn't return affected row count for delete
    console.log(`[JobQueue] Cleaned up old jobs older than ${olderThanDays} days`);
    return 0;
  }
}

// Singleton export
export const jobQueueService = JobQueueService.getInstance();

