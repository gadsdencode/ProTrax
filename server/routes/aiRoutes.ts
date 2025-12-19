import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { asyncHandler, createError } from "../errorHandler";
import { db } from "../db";
import { tasks, timeEntries } from "@shared/schema";
import { ne } from "drizzle-orm";

const router = Router();

// ============= EXISTING AI ENDPOINTS =============

// Predict project deadline
router.post('/predict-deadline', isAuthenticated, asyncHandler(async (req, res) => {
  const { predictProjectDeadline } = await import('../gemini');
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
  const projectTasks = await storage.getTasks(projectId);
  
  // Pass both tasks and project data to get enriched predictions
  const prediction = await predictProjectDeadline(projectTasks, project);
  res.json(prediction);
}));

// Generate project summary
router.post('/generate-summary', isAuthenticated, asyncHandler(async (req, res) => {
  const { generateProjectSummary } = await import('../gemini');
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

// Summarize comments
router.post('/summarize-comments', isAuthenticated, asyncHandler(async (req, res) => {
  const { summarizeComments } = await import('../gemini');
  const { comments } = req.body;
  const summary = await summarizeComments(comments);
  res.json({ summary });
}));

// Assess risk
router.post('/assess-risk', isAuthenticated, asyncHandler(async (req, res) => {
  const { assessRisk } = await import('../gemini');
  const { riskDescription } = req.body;
  const assessment = await assessRisk(riskDescription);
  res.json(assessment);
}));

// ============= AI-ENHANCED RISK & ESTIMATION ENDPOINTS =============

/**
 * POST /api/ai/analyze-risks
 * Analyzes project tasks and dependencies to detect potential risks and bottlenecks
 * 
 * Body: { projectId: number }
 * Response: RiskDetectionResult
 */
router.post('/analyze-risks', isAuthenticated, asyncHandler(async (req, res) => {
  const { analyzeProjectRisks } = await import('../gemini');
  const { projectId } = req.body;
  
  if (!projectId) {
    throw createError.badRequest("projectId is required");
  }
  
  // Fetch project data
  const project = await storage.getProject(projectId);
  if (!project) {
    throw createError.notFound("Project not found");
  }
  
  // Fetch tasks and dependencies for the project
  const projectTasks = await storage.getTasks(projectId);
  const dependencies = await storage.getProjectDependencies(projectId);
  
  // Perform AI risk analysis
  const riskAnalysis = await analyzeProjectRisks(project, projectTasks, dependencies);
  
  res.json({
    projectId,
    projectName: project.name,
    analyzedAt: new Date().toISOString(),
    ...riskAnalysis,
  });
}));

/**
 * POST /api/ai/estimate-effort
 * Uses historical task data to suggest effort estimates for unestimated tasks
 * 
 * Body: { projectId: number, taskIds?: number[] }
 * Response: EffortEstimationResult
 */
router.post('/estimate-effort', isAuthenticated, asyncHandler(async (req, res) => {
  const { estimateTaskEffort } = await import('../gemini');
  const { projectId, taskIds } = req.body;
  
  if (!projectId) {
    throw createError.badRequest("projectId is required");
  }
  
  // Fetch project to verify it exists
  const project = await storage.getProject(projectId);
  if (!project) {
    throw createError.notFound("Project not found");
  }
  
  // Fetch tasks for the project
  const projectTasks = await storage.getTasks(projectId);
  
  // Determine which tasks need estimates
  let tasksToEstimate = projectTasks.filter(t => !t.estimatedHours && !t.storyPoints);
  
  // If specific task IDs provided, filter to those
  if (taskIds && Array.isArray(taskIds) && taskIds.length > 0) {
    tasksToEstimate = projectTasks.filter(t => taskIds.includes(t.id));
  }
  
  if (tasksToEstimate.length === 0) {
    return res.json({
      projectId,
      projectName: project.name,
      message: "All tasks already have estimates or no matching tasks found",
      taskEstimates: [],
      teamVelocity: {
        averagePointsPerSprint: 0,
        averageHoursPerTask: 0,
        dataPointsUsed: 0,
      },
      recommendations: [],
    });
  }
  
  // Fetch historical data from ALL projects (excluding current project tasks that aren't done)
  const historicalTasks = await db
    .select()
    .from(tasks)
    .where(ne(tasks.projectId, projectId));
  
  // Include completed tasks from current project as historical data
  const completedCurrentProjectTasks = projectTasks.filter(t => t.status === 'done');
  const allHistoricalTasks = [...historicalTasks, ...completedCurrentProjectTasks];
  
  // Fetch time entries for estimation accuracy
  const historicalTimeEntries = await db.select().from(timeEntries);
  
  // Perform AI effort estimation
  const estimation = await estimateTaskEffort(
    tasksToEstimate, 
    allHistoricalTasks, 
    historicalTimeEntries
  );
  
  res.json({
    projectId,
    projectName: project.name,
    estimatedAt: new Date().toISOString(),
    tasksAnalyzed: tasksToEstimate.length,
    ...estimation,
  });
}));

/**
 * POST /api/ai/comprehensive-analysis
 * Performs complete AI analysis including risks, estimates, and health scoring
 * 
 * Body: { projectId: number }
 * Response: ComprehensiveAnalysisResult
 */
router.post('/comprehensive-analysis', isAuthenticated, asyncHandler(async (req, res) => {
  const { comprehensiveProjectAnalysis } = await import('../gemini');
  const { projectId } = req.body;
  
  if (!projectId) {
    throw createError.badRequest("projectId is required");
  }
  
  // Fetch project data
  const project = await storage.getProject(projectId);
  if (!project) {
    throw createError.notFound("Project not found");
  }
  
  // Gather all required data
  const projectTasks = await storage.getTasks(projectId);
  const dependencies = await storage.getProjectDependencies(projectId);
  
  // Fetch historical data
  const historicalTasks = await db
    .select()
    .from(tasks)
    .where(ne(tasks.projectId, projectId));
  
  const historicalTimeEntries = await db.select().from(timeEntries);
  
  // Perform comprehensive analysis
  const analysis = await comprehensiveProjectAnalysis(
    project,
    projectTasks,
    dependencies,
    historicalTasks,
    historicalTimeEntries
  );
  
  res.json({
    projectId,
    projectName: project.name,
    analyzedAt: new Date().toISOString(),
    taskCount: projectTasks.length,
    ...analysis,
  });
}));

/**
 * POST /api/ai/apply-estimates
 * Applies AI-suggested estimates to tasks (requires user confirmation)
 * 
 * Body: { 
 *   estimates: Array<{ taskId: number, storyPoints?: number, estimatedHours?: number }>
 * }
 * Response: { updated: number, tasks: Task[] }
 */
router.post('/apply-estimates', isAuthenticated, asyncHandler(async (req: any, res) => {
  const { estimates } = req.body;
  const userId = req.user.id;
  
  if (!estimates || !Array.isArray(estimates) || estimates.length === 0) {
    throw createError.badRequest("estimates array is required");
  }
  
  const updatedTasks = [];
  
  for (const estimate of estimates) {
    if (!estimate.taskId) continue;
    
    const updateData: any = {};
    
    if (estimate.storyPoints !== undefined && estimate.storyPoints !== null) {
      updateData.storyPoints = Math.round(estimate.storyPoints);
    }
    
    if (estimate.estimatedHours !== undefined && estimate.estimatedHours !== null) {
      updateData.estimatedHours = estimate.estimatedHours.toFixed(2);
    }
    
    if (Object.keys(updateData).length > 0) {
      try {
        const updatedTask = await storage.updateTask(estimate.taskId, updateData, userId);
        updatedTasks.push(updatedTask);
      } catch (error) {
        console.error(`Failed to update task ${estimate.taskId}:`, error);
      }
    }
  }
  
  res.json({
    updated: updatedTasks.length,
    tasks: updatedTasks,
    message: `Successfully applied estimates to ${updatedTasks.length} task(s)`,
  });
}));

/**
 * GET /api/ai/project-health/:projectId
 * Quick endpoint to get project health score and summary
 * 
 * Response: { healthScore: number, riskLevel: string, summary: string }
 */
router.get('/project-health/:projectId', isAuthenticated, asyncHandler(async (req, res) => {
  const { analyzeProjectRisks } = await import('../gemini');
  const projectId = parseInt(req.params.projectId);
  
  if (isNaN(projectId)) {
    throw createError.badRequest("Invalid projectId");
  }
  
  const project = await storage.getProject(projectId);
  if (!project) {
    throw createError.notFound("Project not found");
  }
  
  const projectTasks = await storage.getTasks(projectId);
  const dependencies = await storage.getProjectDependencies(projectId);
  
  // Calculate basic health metrics without full AI analysis for quick response
  const taskStats = {
    total: projectTasks.length,
    completed: projectTasks.filter(t => t.status === 'done').length,
    blocked: projectTasks.filter(t => t.status === 'blocked').length,
    overdue: projectTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length,
  };
  
  // Quick health score calculation
  const completionRate = taskStats.total > 0 ? taskStats.completed / taskStats.total : 0;
  const blockedPenalty = taskStats.blocked * 5;
  const overduePenalty = taskStats.overdue * 10;
  
  let quickHealthScore = Math.max(0, Math.min(100, 
    completionRate * 60 + 40 - blockedPenalty - overduePenalty
  ));
  
  // Determine risk level based on quick score
  let quickRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (quickHealthScore < 40) quickRiskLevel = 'critical';
  else if (quickHealthScore < 60) quickRiskLevel = 'high';
  else if (quickHealthScore < 80) quickRiskLevel = 'medium';
  
  // Perform quick AI analysis for summary
  const riskAnalysis = await analyzeProjectRisks(project, projectTasks, dependencies);
  
  res.json({
    projectId,
    projectName: project.name,
    healthScore: Math.round(100 - riskAnalysis.riskScore),
    riskLevel: riskAnalysis.overallRiskLevel,
    riskScore: riskAnalysis.riskScore,
    summary: riskAnalysis.summary,
    quickStats: taskStats,
    topRisks: riskAnalysis.identifiedRisks.slice(0, 3),
  });
}));

export default router;