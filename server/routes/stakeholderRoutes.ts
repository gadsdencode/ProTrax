import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler, createError } from "../errorHandler";
import { insertProjectStakeholderSchema } from "@shared/schema";

const router = Router();

// Get project stakeholders
router.get('/projects/:id/stakeholders', isAuthenticated, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const stakeholders = await storage.getProjectStakeholders(projectId);
  res.json(stakeholders);
}));

// Add project stakeholder
router.post('/projects/:id/stakeholders', isAuthenticated, asyncHandler(async (req: any, res) => {
  const projectId = parseInt(req.params.id);
  const userId = req.user.claims.sub;
  
  // Validate input
  const data = insertProjectStakeholderSchema.parse({
    ...req.body,
    projectId,
    addedBy: userId
  });
  
  // Check if stakeholder already exists
  const existing = await storage.getProjectStakeholders(projectId);
  if (existing.some(s => s.userId === data.userId)) {
    throw createError.badRequest("User is already a stakeholder");
  }
  
  const stakeholder = await storage.addProjectStakeholder(data);
  res.status(201).json(stakeholder);
}));

// Remove project stakeholder
router.delete('/projects/:id/stakeholders/:userId', isAuthenticated, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const userId = req.params.userId;
  await storage.removeProjectStakeholder(projectId, userId);
  res.status(204).send();
}));

// Update stakeholder
router.patch('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const updates = req.body;
  const stakeholder = await storage.updateProjectStakeholder(id, updates);
  res.json(stakeholder);
}));

export default router;