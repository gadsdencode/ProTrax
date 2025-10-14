import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler } from "../errorHandler";
import { insertRiskSchema } from "@shared/schema";

const router = Router();

// Get risks for project
router.get('/projects/:projectId/risks', isAuthenticated, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const risks = await storage.getRisks(projectId);
  res.json(risks);
}));

// Create risk
router.post('/', isAuthenticated, asyncHandler(async (req, res) => {
  const data = insertRiskSchema.parse(req.body);
  const risk = await storage.createRisk(data);
  res.status(201).json(risk);
}));

// Update risk
router.patch('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const risk = await storage.updateRisk(id, req.body);
  res.json(risk);
}));

export default router;