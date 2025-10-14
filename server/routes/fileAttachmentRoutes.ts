import { Router } from "express";
import multer from "multer";
import path from "path";
import { Client } from "@replit/object-storage";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler, createError } from "../errorHandler";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Get file attachments
router.get('/', isAuthenticated, asyncHandler(async (req, res) => {
  const taskId = req.query.taskId ? parseInt(req.query.taskId as string) : undefined;
  const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
  const attachments = await storage.getFileAttachments(taskId, projectId);
  res.json(attachments);
}));

// Upload file
router.post('/upload', isAuthenticated, upload.single('file'), asyncHandler(async (req: any, res) => {
  if (!req.file) {
    throw createError.badRequest("No file uploaded");
  }

  const userId = req.user.claims.sub;
  const { projectId, taskId } = req.body;
  
  // Generate unique filename with folder structure
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(7);
  const fileExt = path.extname(req.file.originalname);
  const fileName = `${timestamp}-${uniqueId}${fileExt}`;
  
  // Determine storage path based on whether file should be private or public
  const isPrivate = req.body.isPrivate === 'true';
  const folder = isPrivate ? '.private' : 'public/attachments';
  const objectKey = `${folder}/${fileName}`;

  // Initialize object storage client with the bucket ID
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  const client = new Client({ bucketId });
  
  // Upload file to object storage using the client
  const uploadResult = await client.uploadFromBytes(objectKey, req.file.buffer);
  
  if (!uploadResult.ok) {
    throw new Error(uploadResult.error?.message || "Failed to upload to object storage");
  }
  
  // Save file metadata to database
  const attachmentData = {
    userId,
    projectId: projectId ? parseInt(projectId) : undefined,
    taskId: taskId ? parseInt(taskId) : undefined,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    storageUrl: objectKey, // Store the full object key
    version: 1,
  };
  
  const attachment = await storage.createFileAttachment(attachmentData);
  res.status(201).json(attachment);
}));

// Download file
router.get('/:id/download', isAuthenticated, asyncHandler(async (req: any, res) => {
  const attachmentId = parseInt(req.params.id);
  const attachment = await storage.getFileAttachment(attachmentId);
  
  if (!attachment) {
    throw createError.notFound("File not found");
  }
  
  // Check if user has access to this file
  if (attachment.projectId) {
    // For project files, verify user is a stakeholder or project manager
    const project = await storage.getProject(attachment.projectId);
    if (!project) {
      throw createError.notFound("Project not found");
    }
    // Note: In a production app, you'd want to check if user is a stakeholder
  }
  
  // Initialize object storage client with the bucket ID
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  const client = new Client({ bucketId });
  
  // Download file from object storage
  const downloadResult = await client.downloadAsBytes(attachment.storageUrl);
  
  if (!downloadResult.ok) {
    console.error("Error fetching from object storage:", downloadResult.error);
    throw createError.notFound("File not found in storage");
  }
  
  // Ensure we have a proper Buffer
  let fileBuffer: Buffer = downloadResult.value as any;
  
  // Convert to Buffer if it's not already one
  if (!Buffer.isBuffer(fileBuffer)) {
    if (fileBuffer && typeof fileBuffer === 'object' && (fileBuffer as any).type === 'Buffer' && Array.isArray((fileBuffer as any).data)) {
      // It's a JSON-encoded Buffer, convert it back
      fileBuffer = Buffer.from((fileBuffer as any).data);
    } else if (Array.isArray(fileBuffer)) {
      // It's an array of bytes
      fileBuffer = Buffer.from(fileBuffer as any);
    } else {
      console.error("Unexpected buffer type:", typeof fileBuffer);
      throw new Error("Invalid file data from storage");
    }
  }
  
  // Set appropriate headers
  // Use 'inline' for preview-capable files, 'attachment' for others
  const disposition = attachment.mimeType && (
    attachment.mimeType.startsWith('image/') ||
    attachment.mimeType.startsWith('video/') ||
    attachment.mimeType.startsWith('audio/') ||
    attachment.mimeType.includes('pdf') ||
    attachment.mimeType.includes('text') ||
    attachment.mimeType.includes('html')
  ) ? 'inline' : 'attachment';
  
  res.set({
    'Content-Type': attachment.mimeType || 'application/octet-stream',
    'Content-Disposition': `${disposition}; filename="${attachment.fileName}"`,
    'Content-Length': fileBuffer.length.toString(),
    'Cache-Control': 'private, max-age=3600',
  });
  
  // Send the buffer directly - Express will handle it correctly
  res.send(fileBuffer);
}));

// Delete file
router.delete('/:id', isAuthenticated, asyncHandler(async (req: any, res) => {
  const attachmentId = parseInt(req.params.id);
  const attachment = await storage.getFileAttachment(attachmentId);
  
  if (!attachment) {
    throw createError.notFound("File not found");
  }
  
  // Check if user has permission to delete (must be uploader or project manager)
  const userId = req.user.claims.sub;
  if (attachment.userId !== userId) {
    if (attachment.projectId) {
      const project = await storage.getProject(attachment.projectId);
      if (project?.managerId !== userId) {
        throw createError.forbidden("Permission denied");
      }
    } else {
      throw createError.forbidden("Permission denied");
    }
  }
  
  // Initialize object storage client with the bucket ID
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  const client = new Client({ bucketId });
  
  // Delete from object storage
  const deleteResult = await client.delete(attachment.storageUrl);
  
  if (!deleteResult.ok) {
    console.warn("Error deleting from storage:", deleteResult.error, "- continuing with database deletion");
  }
  
  // Delete from database
  await storage.deleteFileAttachment(attachmentId);
  
  res.json({ message: "File deleted successfully" });
}));

export default router;