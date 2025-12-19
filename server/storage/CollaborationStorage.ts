/**
 * Collaboration-related database operations.
 * Handles comments, file attachments, and notifications.
 * 
 * Supports Dependency Injection: Pass a custom database instance
 * via constructor for testing or multi-tenancy scenarios.
 */

import {
  comments,
  fileAttachments,
  notifications,
  type Comment,
  type InsertComment,
  type FileAttachment,
  type InsertFileAttachment,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db as defaultDb } from "../db";
import { eq, desc, asc } from "drizzle-orm";
import type { ICollaborationStorage, DatabaseInstance } from "./types";

export class CollaborationStorage implements ICollaborationStorage {
  private readonly db: DatabaseInstance;

  /**
   * Creates a CollaborationStorage instance.
   * @param dbInstance - Optional database instance for dependency injection.
   *                     Defaults to the shared db instance if not provided.
   */
  constructor(dbInstance?: DatabaseInstance) {
    this.db = dbInstance ?? defaultDb;
  }

  // ============= COMMENTS =============

  async getComments(taskId: number): Promise<Comment[]> {
    return await this.db.select().from(comments).where(eq(comments.taskId, taskId)).orderBy(asc(comments.createdAt));
  }

  async createComment(commentData: InsertComment): Promise<Comment> {
    const [comment] = await this.db.insert(comments).values(commentData).returning();
    return comment;
  }

  // ============= FILE ATTACHMENTS =============

  async getFileAttachments(taskId?: number, projectId?: number): Promise<FileAttachment[]> {
    if (taskId) {
      return await this.db.select().from(fileAttachments).where(eq(fileAttachments.taskId, taskId));
    }
    if (projectId) {
      return await this.db.select().from(fileAttachments).where(eq(fileAttachments.projectId, projectId));
    }
    return await this.db.select().from(fileAttachments);
  }

  async getFileAttachment(id: number): Promise<FileAttachment | undefined> {
    const [attachment] = await this.db.select().from(fileAttachments).where(eq(fileAttachments.id, id));
    return attachment;
  }

  async createFileAttachment(attachmentData: InsertFileAttachment): Promise<FileAttachment> {
    const [attachment] = await this.db.insert(fileAttachments).values(attachmentData).returning();
    return attachment;
  }

  async deleteFileAttachment(id: number): Promise<void> {
    await this.db.delete(fileAttachments).where(eq(fileAttachments.id, id));
  }

  // ============= NOTIFICATIONS =============

  async getNotifications(userId: string): Promise<Notification[]> {
    return await this.db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await this.db.insert(notifications).values(notificationData).returning();
    return notification;
  }

  async markNotificationRead(id: number): Promise<void> {
    await this.db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }
}
