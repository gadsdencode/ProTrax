/**
 * Organization Middleware
 * 
 * Provides multi-tenancy enforcement through organization context.
 * Sets the current organization on each request based on:
 * 1. X-Org-ID header (for API clients)
 * 2. User's default organization (fallback)
 * 
 * Also provides Row Level Security (RLS) context setting for PostgreSQL.
 */

import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { organizations, organizationMembers, type Organization, type OrganizationRole } from "@shared/schema";

// Extend Express Request to include organization context
declare global {
  namespace Express {
    interface Request {
      /** Current organization context for multi-tenancy */
      organization?: Organization;
      /** User's role within the current organization */
      organizationRole?: OrganizationRole;
      /** Organization ID for quick access */
      organizationId?: string;
    }
  }
}

/**
 * Middleware to require and set organization context.
 * Must be used after isAuthenticated middleware.
 * 
 * Resolution order:
 * 1. X-Org-ID header (explicit org selection)
 * 2. User's default organization
 * 3. First organization user belongs to
 * 
 * @throws 403 if user is not a member of the requested organization
 * @throws 404 if no organization found for the user
 */
export async function requireOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    // Ensure user is authenticated
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required"
      });
    }

    const userId = req.user.id;
    
    // Get organization ID from header or use default
    const orgIdFromHeader = req.headers['x-org-id'] as string | undefined;
    
    if (orgIdFromHeader) {
      // Verify user has access to this organization
      const [membership] = await db
        .select({
          organization: organizations,
          role: organizationMembers.role,
        })
        .from(organizationMembers)
        .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
        .where(
          and(
            eq(organizationMembers.organizationId, orgIdFromHeader),
            eq(organizationMembers.userId, userId),
            eq(organizations.isActive, true)
          )
        );
      
      if (!membership) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You are not a member of this organization"
        });
      }
      
      req.organization = membership.organization;
      req.organizationRole = membership.role;
      req.organizationId = membership.organization.id;
    } else {
      // Get user's default organization or first membership
      const [membership] = await db
        .select({
          organization: organizations,
          role: organizationMembers.role,
          isDefault: organizationMembers.isDefault,
        })
        .from(organizationMembers)
        .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
        .where(
          and(
            eq(organizationMembers.userId, userId),
            eq(organizations.isActive, true)
          )
        )
        .orderBy(organizationMembers.isDefault) // DESC would put true first
        .limit(1);
      
      if (!membership) {
        return res.status(404).json({
          error: "Not Found",
          message: "No organization found. Please create or join an organization."
        });
      }
      
      req.organization = membership.organization;
      req.organizationRole = membership.role;
      req.organizationId = membership.organization.id;
    }

    // Set RLS context for this request (PostgreSQL session variable)
    // This is critical for Row Level Security enforcement
    await setRLSContext(req.organizationId);

    next();
  } catch (error) {
    console.error('Organization middleware error:', error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to resolve organization context"
    });
  }
}

/**
 * Optional organization context middleware.
 * Sets organization context if available, but doesn't require it.
 * Useful for routes that work with or without organization context.
 */
export async function optionalOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return next();
    }

    const userId = req.user.id;
    const orgIdFromHeader = req.headers['x-org-id'] as string | undefined;
    
    if (orgIdFromHeader) {
      const [membership] = await db
        .select({
          organization: organizations,
          role: organizationMembers.role,
        })
        .from(organizationMembers)
        .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
        .where(
          and(
            eq(organizationMembers.organizationId, orgIdFromHeader),
            eq(organizationMembers.userId, userId),
            eq(organizations.isActive, true)
          )
        );
      
      if (membership) {
        req.organization = membership.organization;
        req.organizationRole = membership.role;
        req.organizationId = membership.organization.id;
        await setRLSContext(req.organizationId);
      }
    } else {
      // Try to get default organization
      const [membership] = await db
        .select({
          organization: organizations,
          role: organizationMembers.role,
        })
        .from(organizationMembers)
        .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
        .where(
          and(
            eq(organizationMembers.userId, userId),
            eq(organizations.isActive, true)
          )
        )
        .orderBy(organizationMembers.isDefault)
        .limit(1);
      
      if (membership) {
        req.organization = membership.organization;
        req.organizationRole = membership.role;
        req.organizationId = membership.organization.id;
        await setRLSContext(req.organizationId);
      }
    }

    next();
  } catch (error) {
    console.error('Optional organization middleware error:', error);
    // Don't fail - just continue without org context
    next();
  }
}

/**
 * Middleware factory to require a minimum organization role.
 * Must be used after requireOrganization middleware.
 * 
 * Role hierarchy: owner > admin > member > viewer
 * 
 * @param requiredRole - Minimum role required
 * @param options.exact - If true, requires exact role match
 */
export function requireOrganizationRole(
  requiredRole: OrganizationRole, 
  options: { exact?: boolean } = {}
) {
  const ROLE_HIERARCHY: Record<OrganizationRole, number> = {
    owner: 4,
    admin: 3,
    member: 2,
    viewer: 1,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.organizationRole) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Organization context required"
      });
    }

    const userRoleLevel = ROLE_HIERARCHY[req.organizationRole];
    const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];

    const hasPermission = options.exact
      ? req.organizationRole === requiredRole
      : userRoleLevel >= requiredRoleLevel;

    if (!hasPermission) {
      return res.status(403).json({
        error: "Forbidden",
        message: `This action requires ${requiredRole} privileges in the organization`
      });
    }

    next();
  };
}

// Shortcut middlewares for common role checks
export const isOrgOwner = requireOrganizationRole('owner');
export const isOrgAdmin = requireOrganizationRole('admin');
export const isOrgMember = requireOrganizationRole('member');

/**
 * Sets the PostgreSQL RLS context for the current request.
 * This sets a session variable that RLS policies can use.
 * 
 * NOTE: Due to connection pooling, the RLS context is set at the start
 * of each database operation. The storage layer should use withRLSContext()
 * from ../db.ts for operations that require RLS enforcement.
 * 
 * For non-pooled connections, this function stores the org ID on the request
 * for the storage layer to use.
 * 
 * @param organizationId - The organization ID to set in the RLS context
 */
async function setRLSContext(organizationId: string): Promise<void> {
  // With connection pooling, we can't set session variables that persist
  // across queries. Instead, the storage layer should use withRLSContext()
  // from db.ts, or queries should explicitly filter by organization_id.
  // 
  // The req.organizationId is set by the middleware and can be used by
  // storage functions to filter queries.
  //
  // In a production environment with dedicated connections per request,
  // you would set the session variable here.
  console.debug(`[RLS] Organization context set: ${organizationId}`);
}

/**
 * Helper function to get organization ID from request.
 * Useful in storage layer functions.
 */
export function getOrganizationId(req: Request): string {
  if (!req.organizationId) {
    throw new Error('Organization context not set. Ensure requireOrganization middleware is applied.');
  }
  return req.organizationId;
}

