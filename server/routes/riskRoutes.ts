import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler } from "../errorHandler";
import { insertRiskSchema } from "@shared/schema";

const router = Router();

// Create risk
router.post('/', isAuthenticated, asyncHandler(async (req, res) => {
  const data = insertRiskSchema.parse(req.body);
  const risk = await storage.createRisk(data);
  res.status(201).json(risk);
}));

// Update risk
router.patch('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const risk = await storage.updateRisk(id, req.body);
  res.json(risk);
}));

export default router;