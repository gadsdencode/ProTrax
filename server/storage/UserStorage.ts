/**
 * User-related database operations.
 * Handles user CRUD and authentication-related queries.
 */

import { users, type User, type UpsertUser, type InsertUser } from "@shared/schema";
import { db } from "../db";
import { eq, sql } from "drizzle-orm";
import type { IUserStorage } from "./types";

// Valid user roles
export type UserRole = 'admin' | 'project_manager' | 'member' | 'viewer';

export class UserStorage implements IUserStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  /**
   * Update a user's role. Admin-only operation.
   */
  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    return user;
  }

  /**
   * Update user profile information.
   */
  async updateUser(userId: string, data: Partial<Pick<User, 'firstName' | 'lastName' | 'email' | 'profileImageUrl' | 'weeklyCapacity'>>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    return user;
  }

  /**
   * Delete a user (admin-only, dangerous operation).
   */
  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  /**
   * Get count of users by role.
   */
  async getUserCountByRole(): Promise<Record<UserRole, number>> {
    const results = await db
      .select({
        role: users.role,
        count: sql<number>`count(*)::int`
      })
      .from(users)
      .groupBy(users.role);
    
    const counts: Record<UserRole, number> = {
      admin: 0,
      project_manager: 0,
      member: 0,
      viewer: 0
    };
    
    for (const row of results) {
      const role = (row.role || 'member') as UserRole;
      counts[role] = row.count;
    }
    
    return counts;
  }

  /**
   * Promote first user to admin if no admins exist.
   * Useful for initial setup.
   */
  async ensureAdminExists(): Promise<User | null> {
    // Check if any admin exists
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'));
    
    if (existingAdmin) {
      return existingAdmin;
    }

    // Get first user by creation date
    const [firstUser] = await db
      .select()
      .from(users)
      .orderBy(users.createdAt)
      .limit(1);
    
    if (!firstUser) {
      return null;
    }

    // Promote to admin
    return this.updateUserRole(firstUser.id, 'admin');
  }
}

