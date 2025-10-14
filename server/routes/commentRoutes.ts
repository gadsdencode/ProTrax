import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler, createError } from "../errorHandler";
import { insertCommentSchema } from "@shared/schema";

const router = Router();

// Get comments (with query parameter)
router.get('/', isAuthenticated, asyncHandler(async (req, res) => {
  if (!req.query.taskId) {
    throw createError.badRequest("taskId query parameter is required");
  }
  const taskId = parseInt(req.query.taskId as string);
  if (isNaN(taskId)) {
    throw createError.badRequest("taskId must be a valid number");
  }
  const comments = await storage.getComments(taskId);
  res.json(comments);
}));


// Create comment
router.post('/', isAuthenticated, asyncHandler(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const data = insertCommentSchema.parse({ ...req.body, userId });
  const comment = await storage.createComment(data);
  res.status(201).json(comment);
}));

export default router;