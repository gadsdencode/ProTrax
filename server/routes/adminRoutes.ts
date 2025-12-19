/**
 * Admin Routes - Protected administrative operations
 * 
 * All routes require admin role. Provides:
 * - User role management
 * - System administration
 * - User management (CRUD)
 */

import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated, hasRole, isAdmin, type UserRole } from "../auth";
import { asyncHandler, createError } from "../errorHandler";
import { z } from "zod";

const router = Router();

// Validation schema for role updates
const updateRoleSchema = z.object({
  role: z.enum(['admin', 'project_manager', 'member', 'viewer'])
});

// ============= USER ROLE MANAGEMENT =============

/**
 * GET /api/admin/users
 * Get all users with their roles (admin only)
 */
router.get('/users', isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
  const users = await storage.getAllUsers();
  // Remove passwords from response
  const sanitizedUsers = users.map(({ password, ...user }) => user);
  res.json(sanitizedUsers);
}));

/**
 * GET /api/admin/users/stats
 * Get user count statistics by role
 */
router.get('/users/stats', isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
  const counts = await storage.getUserCountByRole();
  const totalUsers = Object.values(counts).reduce((sum, count) => sum + count, 0);
  res.json({ counts, totalUsers });
}));

/**
 * PATCH /api/admin/users/:id/role
 * Update a user's role (admin only)
 */
router.patch('/users/:id/role', isAuthenticated, isAdmin, asyncHandler(async (req: any, res) => {
  const userId = req.params.id;
  const currentUserId = req.user.id;
  
  // Validate input
  const { role } = updateRoleSchema.parse(req.body);
  
  // Get target user
  const targetUser = await storage.getUser(userId);
  if (!targetUser) {
    throw createError.notFound("User not found");
  }
  
  // Prevent self-demotion from admin (safety measure)
  if (userId === currentUserId && role !== 'admin') {
    throw createError.badRequest("Cannot demote yourself from admin. Another admin must do this.");
  }
  
  // Prevent demoting the last admin
  if (targetUser.role === 'admin' && role !== 'admin') {
    const counts = await storage.getUserCountByRole();
    if (counts.admin <= 1) {
      throw createError.badRequest("Cannot demote the last admin. Promote another user first.");
    }
  }
  
  const updatedUser = await storage.updateUserRole(userId, role as UserRole);
  const { password, ...sanitizedUser } = updatedUser;
  
  res.json(sanitizedUser);
}));

/**
 * DELETE /api/admin/users/:id
 * Delete a user (admin only, dangerous)
 */
router.delete('/users/:id', isAuthenticated, isAdmin, asyncHandler(async (req: any, res) => {
  const userId = req.params.id;
  const currentUserId = req.user.id;
  
  // Prevent self-deletion
  if (userId === currentUserId) {
    throw createError.badRequest("Cannot delete your own account");
  }
  
  // Get target user
  const targetUser = await storage.getUser(userId);
  if (!targetUser) {
    throw createError.notFound("User not found");
  }
  
  // Prevent deleting the last admin
  if (targetUser.role === 'admin') {
    const counts = await storage.getUserCountByRole();
    if (counts.admin <= 1) {
      throw createError.badRequest("Cannot delete the last admin");
    }
  }
  
  await storage.deleteUser(userId);
  res.status(204).send();
}));

/**
 * PATCH /api/admin/users/:id
 * Update user details (admin only)
 */
router.patch('/users/:id', isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
  const userId = req.params.id;
  
  const targetUser = await storage.getUser(userId);
  if (!targetUser) {
    throw createError.notFound("User not found");
  }
  
  // Only allow updating specific fields
  const allowedFields = ['firstName', 'lastName', 'email', 'weeklyCapacity'];
  const updateData: Record<string, any> = {};
  
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }
  
  const updatedUser = await storage.updateUser(userId, updateData);
  const { password, ...sanitizedUser } = updatedUser;
  
  res.json(sanitizedUser);
}));

// ============= SYSTEM ADMINISTRATION =============

/**
 * POST /api/admin/setup
 * Initial setup - promotes first user to admin if no admin exists
 * This endpoint is special: it only works if there are no admins yet
 */
router.post('/setup', isAuthenticated, asyncHandler(async (req: any, res) => {
  const counts = await storage.getUserCountByRole();
  
  // If admins already exist, only admins can use this endpoint
  if (counts.admin > 0) {
    const currentUser = req.user;
    if (currentUser.role !== 'admin') {
      throw createError.forbidden("System already has admin users");
    }
    return res.json({ message: "Admin already exists", adminCount: counts.admin });
  }
  
  // Promote first user to admin
  const admin = await storage.ensureAdminExists();
  
  if (!admin) {
    throw createError.badRequest("No users found to promote");
  }
  
  const { password, ...sanitizedAdmin } = admin;
  res.json({ 
    message: "Admin created successfully", 
    admin: sanitizedAdmin 
  });
}));

/**
 * GET /api/admin/system/health
 * System health check (admin only)
 */
router.get('/system/health', isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
  const userStats = await storage.getUserCountByRole();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    users: userStats
  });
}));

export default router;

