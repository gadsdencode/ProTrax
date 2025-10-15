import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { asyncHandler } from "../errorHandler";
import { insertTimeEntrySchema } from "@shared/schema";

const router = Router();

// Create time entry
router.post('/', isAuthenticated, asyncHandler(async (req: any, res) => {
  const userId = req.user.id;
  const data = insertTimeEntrySchema.parse({ ...req.body, userId });
  const entry = await storage.createTimeEntry(data);
  res.status(201).json(entry);
}));

export default router;