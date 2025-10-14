import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler } from "../errorHandler";
import { insertDashboardWidgetSchema } from "@shared/schema";

const router = Router();

// Get dashboard widgets for user
router.get('/', isAuthenticated, asyncHandler(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const widgets = await storage.getDashboardWidgets(userId);
  res.json(widgets);
}));

// Create dashboard widget
router.post('/', isAuthenticated, asyncHandler(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const data = insertDashboardWidgetSchema.parse({ ...req.body, userId });
  const widget = await storage.createDashboardWidget(data);
  res.status(201).json(widget);
}));

export default router;