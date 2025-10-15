import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { asyncHandler, createError } from "../errorHandler";

const router = Router();

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
  const tasks = await storage.getTasks(projectId);
  
  // Pass both tasks and project data to get enriched predictions
  const prediction = await predictProjectDeadline(tasks, project);
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

export default router;