import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler } from "../errorHandler";
import { insertExpenseSchema } from "@shared/schema";

const router = Router();

// Create expense
router.post('/', isAuthenticated, asyncHandler(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const data = insertExpenseSchema.parse({ ...req.body, submittedBy: userId });
  const expense = await storage.createExpense(data);
  res.status(201).json(expense);
}));

export default router;