import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler } from "../errorHandler";
import { insertAutomationRuleSchema } from "@shared/schema";

const router = Router();

// Get automation rules for project
router.get('/projects/:projectId/automation-rules', isAuthenticated, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const rules = await storage.getAutomationRules(projectId);
  res.json(rules);
}));

// Create automation rule
router.post('/', isAuthenticated, asyncHandler(async (req, res) => {
  const data = insertAutomationRuleSchema.parse(req.body);
  const rule = await storage.createAutomationRule(data);
  res.status(201).json(rule);
}));

export default router;