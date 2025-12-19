/**
 * Job Routes - API endpoints for async job management
 * 
 * Provides endpoints for:
 * - Checking job status
 * - Retrieving job results
 * - Listing user's jobs
 */

import { Router } from 'express';
import { isAuthenticated } from '../auth';
import { asyncHandler, createError } from '../errorHandler';
import { jobQueueService } from '../services/jobQueueService';

const router = Router();

/**
 * GET /api/jobs/:id
 * Get the status of a specific job
 */
router.get('/:id', isAuthenticated, asyncHandler(async (req: any, res) => {
  const jobId = req.params.id;
  const userId = req.user.id;

  const job = await jobQueueService.getJobForUser(jobId, userId);
  
  if (!job) {
    throw createError.notFound('Job not found');
  }

  // Build response with relevant job info
  const response = {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    progressMessage: job.progressMessage,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    // Only include result/error data if job is finished
    ...(job.status === 'completed' && { result: job.resultData }),
    ...(job.status === 'failed' && { error: job.errorMessage }),
  };

  res.json(response);
}));

/**
 * GET /api/jobs/:id/result
 * Get the full result of a completed job
 */
router.get('/:id/result', isAuthenticated, asyncHandler(async (req: any, res) => {
  const jobId = req.params.id;
  const userId = req.user.id;

  const job = await jobQueueService.getJobForUser(jobId, userId);
  
  if (!job) {
    throw createError.notFound('Job not found');
  }

  if (job.status === 'pending' || job.status === 'processing') {
    throw createError.badRequest('Job is still in progress');
  }

  if (job.status === 'failed') {
    throw createError.badRequest(`Job failed: ${job.errorMessage}`);
  }

  res.json({
    id: job.id,
    status: job.status,
    result: job.resultData,
    completedAt: job.completedAt,
  });
}));

/**
 * GET /api/jobs
 * Get list of user's recent jobs
 */
router.get('/', isAuthenticated, asyncHandler(async (req: any, res) => {
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

  const jobs = await jobQueueService.getUserJobs(userId, limit);
  
  // Map to response format (exclude sensitive input data)
  const response = jobs.map(job => {
    const base = {
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      progressMessage: job.progressMessage,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
    
    // Include brief result summary for completed jobs
    if (job.status === 'completed' && job.resultData) {
      return {
        ...base,
        resultSummary: {
          projectId: (job.resultData as any).projectId,
          projectName: (job.resultData as any).projectName,
        }
      };
    }
    
    // Include error for failed jobs
    if (job.status === 'failed') {
      return {
        ...base,
        error: job.errorMessage,
      };
    }
    
    return base;
  });

  res.json(response);
}));

export default router;

