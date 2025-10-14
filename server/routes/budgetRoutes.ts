import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler } from "../errorHandler";
import { insertBudgetItemSchema } from "@shared/schema";

const router = Router();

// Create budget item
router.post('/', isAuthenticated, asyncHandler(async (req, res) => {
  const data = insertBudgetItemSchema.parse(req.body);
  const item = await storage.createBudgetItem(data);
  res.status(201).json(item);
}));

export default router;