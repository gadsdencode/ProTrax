import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler } from "../errorHandler";

const router = Router();

// Get notifications for user
router.get('/', isAuthenticated, asyncHandler(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const notifications = await storage.getNotifications(userId);
  res.json(notifications);
}));

// Mark notification as read
router.post('/:id/read', isAuthenticated, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  await storage.markNotificationRead(id);
  res.status(204).send();
}));

export default router;