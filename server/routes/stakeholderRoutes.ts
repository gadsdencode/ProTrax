import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { asyncHandler, createError } from "../errorHandler";
import { insertProjectStakeholderSchema } from "@shared/schema";

const router = Router();

// Update stakeholder
router.patch('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const updates = req.body;
  const stakeholder = await storage.updateProjectStakeholder(id, updates);
  res.json(stakeholder);
}));

export default router;