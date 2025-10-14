import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler } from "../errorHandler";
import { insertKanbanColumnSchema } from "@shared/schema";

const router = Router();

// Get kanban columns
router.get('/columns', isAuthenticated, asyncHandler(async (req, res) => {
  const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
  if (!projectId) {
    return res.json([]);
  }
  const columns = await storage.getKanbanColumns(projectId);
  res.json(columns);
}));

// Create kanban column
router.post('/columns', isAuthenticated, asyncHandler(async (req, res) => {
  const data = insertKanbanColumnSchema.parse(req.body);
  const column = await storage.createKanbanColumn(data);
  res.status(201).json(column);
}));

export default router;