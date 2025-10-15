import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { asyncHandler, createError } from "../errorHandler";
import { insertCustomFieldSchema } from "@shared/schema";

const router = Router();

// Create custom field
router.post('/', isAuthenticated, asyncHandler(async (req, res) => {
  const data = insertCustomFieldSchema.parse(req.body);
  const field = await storage.createCustomField(data);
  res.status(201).json(field);
}));

// Delete custom field
router.delete('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  await storage.deleteCustomField(id);
  res.status(204).send();
}));

export default router;