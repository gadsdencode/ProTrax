/**
 * Organization Routes
 * 
 * Handles all organization-related API endpoints:
 * - Organization CRUD
 * - Member management
 * - Invitation handling
 * - Organization switching
 */

import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { asyncHandler, createError } from "../errorHandler";
import { 
  insertOrganizationSchema, 
  insertOrganizationInvitationSchema,
  type OrganizationRole 
} from "@shared/schema";
import { 
  requireOrganization, 
  requireOrganizationRole,
  optionalOrganization,
  isOrgOwner,
  isOrgAdmin,
} from "../middleware/organizationMiddleware";

const router = Router();

// ============================================================================
// ORGANIZATION CRUD
// ============================================================================

/**
 * GET /api/organizations
 * Get all organizations the current user belongs to
 */
router.get('/', isAuthenticated, asyncHandler(async (req: any, res) => {
  const userId = req.user.id;
  const organizations = await storage.getUserOrganizations(userId);
  res.json(organizations);
}));

/**
 * GET /api/organizations/current
 * Get the current organization context
 */
router.get('/current', isAuthenticated, requireOrganization, asyncHandler(async (req: any, res) => {
  res.json({
    organization: req.organization,
    role: req.organizationRole,
  });
}));

/**
 * GET /api/organizations/:id
 * Get a specific organization (must be a member)
 */
router.get('/:id', isAuthenticated, asyncHandler(async (req: any, res) => {
  const userId = req.user.id;
  const orgId = req.params.id;
  
  // Check membership
  const membership = await storage.organizations.getMembership(orgId, userId);
  if (!membership) {
    throw createError.forbidden("You are not a member of this organization");
  }
  
  const organization = await storage.getOrganization(orgId);
  if (!organization) {
    throw createError.notFound("Organization not found");
  }
  
  res.json({
    ...organization,
    role: membership.role,
  });
}));

/**
 * POST /api/organizations
 * Create a new organization
 */
router.post('/', isAuthenticated, asyncHandler(async (req: any, res) => {
  const userId = req.user.id;
  
  // Parse and validate input
  const data = insertOrganizationSchema.parse(req.body);
  
  // Check slug availability
  const slugAvailable = await storage.organizations.isSlugAvailable(data.slug);
  if (!slugAvailable) {
    throw createError.badRequest("This slug is already taken");
  }
  
  // Create organization with creator as owner
  const result = await storage.createOrganization(data, userId);
  
  res.status(201).json({
    ...result.organization,
    role: result.membership.role,
  });
}));

/**
 * PATCH /api/organizations/:id
 * Update organization details (requires admin+ role)
 */
router.patch('/:id', 
  isAuthenticated, 
  requireOrganization,
  isOrgAdmin,
  asyncHandler(async (req: any, res) => {
    const orgId = req.params.id;
    
    // Ensure user is updating their current organization
    if (req.organizationId !== orgId) {
      throw createError.forbidden("Can only update the current organization");
    }
    
    // Validate slug if provided
    if (req.body.slug) {
      const slugAvailable = await storage.organizations.isSlugAvailable(req.body.slug, orgId);
      if (!slugAvailable) {
        throw createError.badRequest("This slug is already taken");
      }
    }
    
    const organization = await storage.updateOrganization(orgId, req.body);
    res.json(organization);
  })
);

/**
 * DELETE /api/organizations/:id
 * Delete an organization (requires owner role)
 */
router.delete('/:id',
  isAuthenticated,
  requireOrganization,
  isOrgOwner,
  asyncHandler(async (req: any, res) => {
    const orgId = req.params.id;
    
    if (req.organizationId !== orgId) {
      throw createError.forbidden("Can only delete the current organization");
    }
    
    await storage.deleteOrganization(orgId);
    res.status(204).send();
  })
);

// ============================================================================
// MEMBER MANAGEMENT
// ============================================================================

/**
 * GET /api/organizations/:id/members
 * Get all members of an organization
 */
router.get('/:id/members',
  isAuthenticated,
  requireOrganization,
  asyncHandler(async (req: any, res) => {
    const orgId = req.params.id;
    
    if (req.organizationId !== orgId) {
      throw createError.forbidden("Can only view members of the current organization");
    }
    
    const members = await storage.getOrganizationMembers(orgId);
    res.json(members);
  })
);

/**
 * PATCH /api/organizations/:id/members/:userId/role
 * Update a member's role (requires admin+ role)
 */
router.patch('/:id/members/:userId/role',
  isAuthenticated,
  requireOrganization,
  isOrgAdmin,
  asyncHandler(async (req: any, res) => {
    const orgId = req.params.id;
    const targetUserId = req.params.userId;
    const { role } = req.body as { role: OrganizationRole };
    
    if (req.organizationId !== orgId) {
      throw createError.forbidden("Can only manage members of the current organization");
    }
    
    // Only owners can promote to owner
    if (role === 'owner' && req.organizationRole !== 'owner') {
      throw createError.forbidden("Only owners can promote to owner role");
    }
    
    // Can't change your own role (prevents locking yourself out)
    if (targetUserId === req.user.id) {
      throw createError.badRequest("Cannot change your own role");
    }
    
    const membership = await storage.organizations.updateMemberRole(orgId, targetUserId, role);
    res.json(membership);
  })
);

/**
 * DELETE /api/organizations/:id/members/:userId
 * Remove a member from the organization (requires admin+ role)
 */
router.delete('/:id/members/:userId',
  isAuthenticated,
  requireOrganization,
  isOrgAdmin,
  asyncHandler(async (req: any, res) => {
    const orgId = req.params.id;
    const targetUserId = req.params.userId;
    
    if (req.organizationId !== orgId) {
      throw createError.forbidden("Can only manage members of the current organization");
    }
    
    // Can't remove yourself (use leave endpoint instead)
    if (targetUserId === req.user.id) {
      throw createError.badRequest("Cannot remove yourself. Use the leave endpoint instead.");
    }
    
    await storage.removeOrganizationMember(orgId, targetUserId);
    res.status(204).send();
  })
);

/**
 * POST /api/organizations/:id/leave
 * Leave an organization
 */
router.post('/:id/leave',
  isAuthenticated,
  asyncHandler(async (req: any, res) => {
    const userId = req.user.id;
    const orgId = req.params.id;
    
    await storage.removeOrganizationMember(orgId, userId);
    res.status(204).send();
  })
);

// ============================================================================
// INVITATION MANAGEMENT
// ============================================================================

/**
 * GET /api/organizations/:id/invitations
 * Get pending invitations (requires admin+ role)
 */
router.get('/:id/invitations',
  isAuthenticated,
  requireOrganization,
  isOrgAdmin,
  asyncHandler(async (req: any, res) => {
    const orgId = req.params.id;
    
    if (req.organizationId !== orgId) {
      throw createError.forbidden("Can only view invitations for the current organization");
    }
    
    const invitations = await storage.organizations.getOrganizationInvitations(orgId);
    res.json(invitations);
  })
);

/**
 * POST /api/organizations/:id/invitations
 * Create an invitation (requires admin+ role)
 */
router.post('/:id/invitations',
  isAuthenticated,
  requireOrganization,
  isOrgAdmin,
  asyncHandler(async (req: any, res) => {
    const orgId = req.params.id;
    const userId = req.user.id;
    
    if (req.organizationId !== orgId) {
      throw createError.forbidden("Can only create invitations for the current organization");
    }
    
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const data = insertOrganizationInvitationSchema.parse({
      ...req.body,
      organizationId: orgId,
      invitedBy: userId,
      expiresAt,
    });
    
    // Only owners can invite as owner
    if (data.role === 'owner' && req.organizationRole !== 'owner') {
      throw createError.forbidden("Only owners can invite with owner role");
    }
    
    const invitation = await storage.organizations.createInvitation(data);
    
    // TODO: Send invitation email
    
    res.status(201).json(invitation);
  })
);

/**
 * DELETE /api/organizations/:id/invitations/:invitationId
 * Revoke an invitation (requires admin+ role)
 */
router.delete('/:id/invitations/:invitationId',
  isAuthenticated,
  requireOrganization,
  isOrgAdmin,
  asyncHandler(async (req: any, res) => {
    const orgId = req.params.id;
    
    if (req.organizationId !== orgId) {
      throw createError.forbidden("Can only revoke invitations for the current organization");
    }
    
    await storage.organizations.revokeInvitation(req.params.invitationId);
    res.status(204).send();
  })
);

/**
 * POST /api/organizations/invitations/:token/accept
 * Accept an invitation by token
 * 
 * SECURITY: The user's email must match the invitation email.
 * This prevents unauthorized token usage.
 */
router.post('/invitations/:token/accept',
  isAuthenticated,
  asyncHandler(async (req: any, res) => {
    const userId = req.user.id;
    const userEmail = req.user.email; // May be null/undefined
    const token = req.params.token;
    
    // Email validation is performed inside acceptInvitation
    const membership = await storage.organizations.acceptInvitation(token, userId, userEmail);
    
    // Get the organization details
    const organization = await storage.getOrganization(membership.organizationId);
    
    res.status(201).json({
      membership,
      organization,
    });
  })
);

// ============================================================================
// ORGANIZATION SWITCHING
// ============================================================================

/**
 * POST /api/organizations/:id/switch
 * Switch to a different organization (sets as default)
 */
router.post('/:id/switch',
  isAuthenticated,
  asyncHandler(async (req: any, res) => {
    const userId = req.user.id;
    const orgId = req.params.id;
    
    // Verify membership
    const membership = await storage.organizations.getMembership(orgId, userId);
    if (!membership) {
      throw createError.forbidden("You are not a member of this organization");
    }
    
    // Set as default organization
    await storage.organizations.setDefaultOrganization(userId, orgId);
    
    const organization = await storage.getOrganization(orgId);
    
    res.json({
      organization,
      role: membership.role,
    });
  })
);

// ============================================================================
// USER INVITATION ENDPOINTS
// ============================================================================

/**
 * GET /api/organizations/my-invitations
 * Get pending invitations for the current user by their email
 * Used on the onboarding page to show invitations the user can accept
 */
router.get('/my-invitations',
  isAuthenticated,
  asyncHandler(async (req: any, res) => {
    const userEmail = req.user.email;
    
    if (!userEmail) {
      // User has no email, can't have invitations
      res.json([]);
      return;
    }
    
    const invitations = await storage.organizations.getPendingInvitationsByEmail(userEmail);
    
    // Remove token from response for security (users don't need it directly)
    const safeInvitations = invitations.map(inv => ({
      id: inv.id,
      organizationId: inv.organizationId,
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      organization: {
        id: inv.organization.id,
        name: inv.organization.name,
        slug: inv.organization.slug,
        description: inv.organization.description,
        logoUrl: inv.organization.logoUrl,
      },
    }));
    
    res.json(safeInvitations);
  })
);

/**
 * POST /api/organizations/my-invitations/:invitationId/accept
 * Accept an invitation for the current user
 */
router.post('/my-invitations/:invitationId/accept',
  isAuthenticated,
  asyncHandler(async (req: any, res) => {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const invitationId = req.params.invitationId;
    
    // Get the invitation to find the token
    const invitations = userEmail 
      ? await storage.organizations.getPendingInvitationsByEmail(userEmail)
      : [];
    
    const invitation = invitations.find(inv => inv.id === invitationId);
    
    if (!invitation) {
      throw createError.notFound('Invitation not found or you do not have access to it');
    }
    
    // Accept using the token (which validates everything)
    const membership = await storage.organizations.acceptInvitation(invitation.token, userId);
    
    // Get the organization details
    const organization = await storage.getOrganization(membership.organizationId);
    
    res.status(201).json({
      membership,
      organization,
    });
  })
);

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * GET /api/organizations/check-slug/:slug
 * Check if a slug is available
 */
router.get('/check-slug/:slug', isAuthenticated, asyncHandler(async (req, res) => {
  const slug = req.params.slug;
  const available = await storage.organizations.isSlugAvailable(slug);
  res.json({ available, slug });
}));

/**
 * POST /api/organizations/generate-slug
 * Generate a unique slug from a name
 */
router.post('/generate-slug', isAuthenticated, asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    throw createError.badRequest("Name is required");
  }
  
  const slug = await storage.organizations.generateUniqueSlug(name);
  res.json({ slug });
}));

export default router;

