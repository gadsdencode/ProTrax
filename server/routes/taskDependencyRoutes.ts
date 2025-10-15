import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { asyncHandler, createError } from "../errorHandler";
import { insertTaskDependencySchema } from "@shared/schema";

const router = Router();

// Create task dependency
router.post('/', isAuthenticated, asyncHandler(async (req, res) => {
  const data = insertTaskDependencySchema.parse(req.body);
  const dependency = await storage.createTaskDependency(data);
  res.status(201).json(dependency);
}));

export default router;