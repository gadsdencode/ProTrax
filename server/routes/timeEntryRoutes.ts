import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler } from "../errorHandler";
import { insertTimeEntrySchema } from "@shared/schema";

const router = Router();

// Get time entries for task
router.get('/tasks/:taskId/time-entries', isAuthenticated, asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const entries = await storage.getTimeEntries(taskId);
  res.json(entries);
}));

// Create time entry
router.post('/', isAuthenticated, asyncHandler(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const data = insertTimeEntrySchema.parse({ ...req.body, userId });
  const entry = await storage.createTimeEntry(data);
  res.status(201).json(entry);
}));

export default router;