import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler } from "../errorHandler";

const router = Router();

// Get all users
router.get('/', isAuthenticated, asyncHandler(async (req, res) => {
  const users = await storage.getAllUsers();
  res.json(users);
}));

export default router;