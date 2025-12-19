/**
 * Organization Storage
 * 
 * Handles all organization-related database operations including:
 * - Organization CRUD
 * - Member management
 * - Invitation handling
 * 
 * Supports Dependency Injection for testing scenarios.
 */

import { 
  organizations, 
  organizationMembers, 
  organizationInvitations,
  users,
  type Organization,
  type InsertOrganization,
  type OrganizationMember,
  type InsertOrganizationMember,
  type OrganizationInvitation,
  type InsertOrganizationInvitation,
  type OrganizationRole,
  type User,
} from "@shared/schema";
import { db as defaultDb } from "../db";
import { eq, and, sql, desc, or, isNull } from "drizzle-orm";
import type { DatabaseInstance } from "./types";
import { randomBytes } from "crypto";

// Re-export types for convenience
export type { Organization, OrganizationMember, OrganizationInvitation, OrganizationRole };

/**
 * Organization member with user details
 */
export interface OrganizationMemberWithUser extends OrganizationMember {
  user: Pick<User, 'id' | 'username' | 'email' | 'firstName' | 'lastName' | 'profileImageUrl'>;
}

/**
 * User's organization membership with organization details
 */
export interface UserOrganizationMembership {
  organization: Organization;
  role: OrganizationRole;
  isDefault: boolean;
  joinedAt: Date | null;
}

export class OrganizationStorage {
  private readonly db: DatabaseInstance;

  constructor(dbInstance?: DatabaseInstance) {
    this.db = dbInstance ?? defaultDb;
  }

  // ============= ORGANIZATION CRUD =============

  /**
   * Get organization by ID
   */
  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    return org;
  }

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug));
    return org;
  }

  /**
   * Create a new organization and add the creator as owner
   */
  async createOrganization(
    data: Omit<InsertOrganization, 'id' | 'createdAt' | 'updatedAt'>,
    creatorUserId: string
  ): Promise<{ organization: Organization; membership: OrganizationMember }> {
    // Use transaction to create org and add owner atomically
    const result = await this.db.transaction(async (tx) => {
      // Create organization
      const [org] = await tx
        .insert(organizations)
        .values(data)
        .returning();

      // Add creator as owner
      const [membership] = await tx
        .insert(organizationMembers)
        .values({
          organizationId: org.id,
          userId: creatorUserId,
          role: 'owner',
          isDefault: true, // First org becomes default
          joinedAt: new Date(),
        })
        .returning();

      return { organization: org, membership };
    });

    return result;
  }

  /**
   * Update organization details
   */
  async updateOrganization(
    id: string, 
    data: Partial<Omit<Organization, 'id' | 'createdAt'>>
  ): Promise<Organization> {
    const [org] = await this.db
      .update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    
    if (!org) {
      throw new Error(`Organization with id ${id} not found`);
    }
    return org;
  }

  /**
   * Soft delete organization (sets isActive to false)
   */
  async deleteOrganization(id: string): Promise<void> {
    await this.db
      .update(organizations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(organizations.id, id));
  }

  /**
   * Hard delete organization and all associated data
   * WARNING: This is destructive and should only be used for cleanup
   */
  async hardDeleteOrganization(id: string): Promise<void> {
    await this.db
      .delete(organizations)
      .where(eq(organizations.id, id));
  }

  // ============= MEMBER MANAGEMENT =============

  /**
   * Get all members of an organization with user details
   */
  async getOrganizationMembers(organizationId: string): Promise<OrganizationMemberWithUser[]> {
    const members = await this.db
      .select({
        id: organizationMembers.id,
        organizationId: organizationMembers.organizationId,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        invitedBy: organizationMembers.invitedBy,
        invitedAt: organizationMembers.invitedAt,
        joinedAt: organizationMembers.joinedAt,
        isDefault: organizationMembers.isDefault,
        createdAt: organizationMembers.createdAt,
        updatedAt: organizationMembers.updatedAt,
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(eq(organizationMembers.organizationId, organizationId))
      .orderBy(organizationMembers.role, organizationMembers.joinedAt);
    
    return members as OrganizationMemberWithUser[];
  }

  /**
   * Get a user's organizations
   */
  async getUserOrganizations(userId: string): Promise<UserOrganizationMembership[]> {
    const memberships = await this.db
      .select({
        organization: organizations,
        role: organizationMembers.role,
        isDefault: organizationMembers.isDefault,
        joinedAt: organizationMembers.joinedAt,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizations.isActive, true)
        )
      )
      .orderBy(desc(organizationMembers.isDefault), organizations.name);
    
    return memberships as UserOrganizationMembership[];
  }

  /**
   * Get a specific membership
   */
  async getMembership(
    organizationId: string, 
    userId: string
  ): Promise<OrganizationMember | undefined> {
    const [membership] = await this.db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId)
        )
      );
    return membership;
  }

  /**
   * Add a member to an organization
   */
  async addMember(
    data: Omit<InsertOrganizationMember, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<OrganizationMember> {
    // Check if already a member
    const existing = await this.getMembership(data.organizationId, data.userId);
    if (existing) {
      throw new Error('User is already a member of this organization');
    }

    const [membership] = await this.db
      .insert(organizationMembers)
      .values({
        ...data,
        joinedAt: new Date(),
      })
      .returning();
    
    return membership;
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: OrganizationRole
  ): Promise<OrganizationMember> {
    // Prevent removing the last owner
    if (role !== 'owner') {
      const owners = await this.db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.role, 'owner')
          )
        );
      
      const isLastOwner = owners.length === 1 && owners[0].userId === userId;
      if (isLastOwner) {
        throw new Error('Cannot remove the last owner. Transfer ownership first.');
      }
    }

    const [membership] = await this.db
      .update(organizationMembers)
      .set({ role, updatedAt: new Date() })
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId)
        )
      )
      .returning();
    
    if (!membership) {
      throw new Error('Membership not found');
    }
    return membership;
  }

  /**
   * Remove a member from an organization
   */
  async removeMember(organizationId: string, userId: string): Promise<void> {
    // Prevent removing the last owner
    const membership = await this.getMembership(organizationId, userId);
    if (membership?.role === 'owner') {
      const owners = await this.db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.role, 'owner')
          )
        );
      
      if (owners.length === 1) {
        throw new Error('Cannot remove the last owner. Delete the organization instead.');
      }
    }

    await this.db
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId)
        )
      );
  }

  /**
   * Set a user's default organization
   */
  async setDefaultOrganization(userId: string, organizationId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Clear all defaults for this user
      await tx
        .update(organizationMembers)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(organizationMembers.userId, userId));
      
      // Set new default
      await tx
        .update(organizationMembers)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(
          and(
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.organizationId, organizationId)
          )
        );
    });
  }

  // ============= INVITATION MANAGEMENT =============

  /**
   * Create an invitation
   */
  async createInvitation(
    data: Omit<InsertOrganizationInvitation, 'id' | 'createdAt' | 'token' | 'acceptedAt'>
  ): Promise<OrganizationInvitation> {
    // Check if user is already a member
    const existingUser = await this.db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);
    
    if (existingUser.length > 0) {
      const existingMembership = await this.getMembership(data.organizationId, existingUser[0].id);
      if (existingMembership) {
        throw new Error('User is already a member of this organization');
      }
    }

    // Check for existing pending invitation
    const [existingInvitation] = await this.db
      .select()
      .from(organizationInvitations)
      .where(
        and(
          eq(organizationInvitations.organizationId, data.organizationId),
          eq(organizationInvitations.email, data.email),
          isNull(organizationInvitations.acceptedAt)
        )
      );
    
    if (existingInvitation && new Date(existingInvitation.expiresAt) > new Date()) {
      throw new Error('An active invitation already exists for this email');
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');

    const [invitation] = await this.db
      .insert(organizationInvitations)
      .values({
        ...data,
        token,
      })
      .returning();
    
    return invitation;
  }

  /**
   * Get pending invitations for an organization
   */
  async getOrganizationInvitations(organizationId: string): Promise<OrganizationInvitation[]> {
    return await this.db
      .select()
      .from(organizationInvitations)
      .where(
        and(
          eq(organizationInvitations.organizationId, organizationId),
          isNull(organizationInvitations.acceptedAt)
        )
      )
      .orderBy(desc(organizationInvitations.createdAt));
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<OrganizationInvitation | undefined> {
    const [invitation] = await this.db
      .select()
      .from(organizationInvitations)
      .where(eq(organizationInvitations.token, token));
    return invitation;
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(token: string, userId: string): Promise<OrganizationMember> {
    const invitation = await this.getInvitationByToken(token);
    
    if (!invitation) {
      throw new Error('Invitation not found');
    }
    
    if (invitation.acceptedAt) {
      throw new Error('Invitation has already been accepted');
    }
    
    if (new Date(invitation.expiresAt) < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Use transaction for atomic operation
    const result = await this.db.transaction(async (tx) => {
      // Mark invitation as accepted
      await tx
        .update(organizationInvitations)
        .set({ acceptedAt: new Date() })
        .where(eq(organizationInvitations.id, invitation.id));

      // Add user as member
      const [membership] = await tx
        .insert(organizationMembers)
        .values({
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
          invitedBy: invitation.invitedBy,
          invitedAt: invitation.createdAt,
          joinedAt: new Date(),
        })
        .returning();
      
      return membership;
    });

    return result;
  }

  /**
   * Revoke an invitation
   */
  async revokeInvitation(invitationId: string): Promise<void> {
    await this.db
      .delete(organizationInvitations)
      .where(eq(organizationInvitations.id, invitationId));
  }

  /**
   * Clean up expired invitations
   */
  async cleanupExpiredInvitations(): Promise<number> {
    const result = await this.db
      .delete(organizationInvitations)
      .where(
        and(
          sql`${organizationInvitations.expiresAt} < NOW()`,
          isNull(organizationInvitations.acceptedAt)
        )
      );
    
    return result.rowCount ?? 0;
  }

  // ============= UTILITY METHODS =============

  /**
   * Check if a slug is available
   */
  async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
    const [existing] = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(
        excludeId
          ? and(eq(organizations.slug, slug), sql`${organizations.id} != ${excludeId}`)
          : eq(organizations.slug, slug)
      );
    return !existing;
  }

  /**
   * Generate a unique slug from a name
   */
  async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 90); // Leave room for suffix

    let slug = baseSlug;
    let suffix = 1;

    while (!(await this.isSlugAvailable(slug))) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    return slug;
  }

  /**
   * Get organization member count
   */
  async getMemberCount(organizationId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId));
    
    return result?.count ?? 0;
  }
}

// Singleton instance
export const organizationStorage = new OrganizationStorage();

