import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { asyncHandler } from "../errorHandler";
import { insertProjectTemplateSchema } from "@shared/schema";

const router = Router();

// Get all project templates
router.get('/', isAuthenticated, asyncHandler(async (req, res) => {
  const templates = await storage.getProjectTemplates();
  res.json(templates);
}));

// Create project template
router.post('/', isAuthenticated, asyncHandler(async (req: any, res) => {
  const userId = req.user.id;
  const data = insertProjectTemplateSchema.parse({ ...req.body, createdBy: userId });
  const template = await storage.createProjectTemplate(data);
  res.status(201).json(template);
}));

export default router;