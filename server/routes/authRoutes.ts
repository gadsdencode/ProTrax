import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler } from "../errorHandler";

const router = Router();

// Get current authenticated user
router.get('/user', isAuthenticated, asyncHandler(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const user = await storage.getUser(userId);
  res.json(user);
}));

export default router;