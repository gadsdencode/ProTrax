import { Router } from "express";
import multer from "multer";
import * as mammoth from "mammoth";
import * as pdfParseModule from "pdf-parse";
const pdfParse = (pdfParseModule as any).default || pdfParseModule;
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler, createError } from "../errorHandler";
import { extractProjectDataFromSOW } from "../gemini";
import { insertProjectSchema } from "@shared/schema";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Get all projects
router.get('/', isAuthenticated, asyncHandler(async (req, res) => {
  const searchQuery = req.query.searchQuery as string | undefined;
  const projects = await storage.getProjects(searchQuery);
  res.json(projects);
}));

// Get single project
router.get('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const project = await storage.getProject(id);
  if (!project) {
    throw createError.notFound("Project not found");
  }
  res.json(project);
}));

// Create project
router.post('/', isAuthenticated, asyncHandler(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const data = insertProjectSchema.parse({ ...req.body, managerId: userId });
  const project = await storage.createProject(data);
  res.status(201).json(project);
}));

// Update project
router.patch('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const project = await storage.updateProject(id, req.body);
  res.json(project);
}));

// Delete project
router.delete('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  await storage.deleteProject(id);
  res.status(204).send();
}));

// Test endpoint for SOW extraction
router.post('/test-sow-extraction', isAuthenticated, asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) {
    throw createError.badRequest("No text provided");
  }
  
  console.log(`[TEST] Testing SOW extraction with ${text.length} characters`);
  
  try {
    const result = await extractProjectDataFromSOW(text);
    res.json(result);
  } catch (error: any) {
    console.error("[TEST] Extraction failed:", error);
    throw createError.badRequest(error.message || "Extraction failed");
  }
}));

// Create project from SOW document
router.post('/create-from-sow', isAuthenticated, upload.single('file'), asyncHandler(async (req: any, res) => {
  if (!req.file) {
    throw createError.badRequest("No file uploaded");
  }

  // Extract text from the document
  console.log(`[SOW Upload] Processing file: ${req.file.originalname}, type: ${req.file.mimetype}, size: ${req.file.size} bytes`);
  
  let text = "";
  const mimeType = req.file.mimetype;
  
  if (mimeType === "application/pdf") {
    // PDF file parsing
    console.log("[SOW Upload] Extracting text from PDF...");
    try {
      const data = await pdfParse(req.file.buffer);
      text = data.text;
      console.log(`[SOW Upload] Extracted ${text.length} characters from PDF`);
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      throw createError.badRequest("Failed to extract text from PDF document");
    }
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    // Word document (.docx or .doc)
    console.log("[SOW Upload] Extracting text from Word document...");
    try {
      const result = await mammoth.extractRawText({
        buffer: req.file.buffer,
      });
      text = result.value;
      console.log(`[SOW Upload] Extracted ${text.length} characters from Word document`);
    } catch (error) {
      console.error("Error extracting text from Word document:", error);
      throw createError.badRequest("Failed to extract text from Word document");
    }
  } else if (mimeType === "text/plain") {
    // Plain text file
    console.log("[SOW Upload] Processing plain text file...");
    text = req.file.buffer.toString('utf-8');
    console.log(`[SOW Upload] Extracted ${text.length} characters from text file`);
  } else {
    throw createError.badRequest(`Unsupported file type: ${mimeType}. Please upload a PDF, Word document (.docx) or text file.`);
  }

  if (!text || text.trim().length === 0) {
    throw createError.badRequest("The uploaded document appears to be empty");
  }
  
  // Log first 500 chars of extracted text for debugging
  console.log(`[SOW Upload] First 500 chars of extracted text: ${text.substring(0, 500)}`);
  console.log(`[SOW Upload] Document contains ${text.split(/\s+/).length} words`);

  // Extract project data from the SOW using Gemini
  let projectData;
  try {
    console.log("[SOW Upload] Calling Gemini API to extract project data...");
    projectData = await extractProjectDataFromSOW(text);
    console.log("[SOW Upload] Gemini API response received");
    console.log(`[SOW Upload] Extracted data: ${JSON.stringify(projectData, null, 2)}`);
  } catch (error: any) {
    console.error("[SOW Upload] Error extracting project data:", error);
    throw createError.badRequest(error.message || "Failed to extract project data from the SOW document");
  }

  // Extract tasks from the project data (we'll create them separately)
  const { tasks, ...projectFields } = projectData;
  console.log(`[SOW Upload] Tasks to create: ${tasks?.length || 0}`);

  // Create the project with the extracted data
  const userId = req.user.claims.sub;
  const data = insertProjectSchema.parse({ 
    ...projectFields, 
    managerId: userId,
    status: 'planning' // Set initial status
  });
  
  console.log(`[SOW Upload] Creating project: ${data.name}`);
  
  // Create project and tasks - save everything that can be saved
  try {
    console.log(`[SOW Upload] Creating project and ${tasks?.length || 0} tasks...`);
    
    // Create project and tasks - partial success is OK
    const result = await storage.createProjectWithTasks(data, tasks || []);
    const { project, tasks: createdTasks, failedTasks } = result;
    
    console.log(`[SOW Upload] Project created with ID: ${project.id}`);
    console.log(`[SOW Upload] Task creation results: ${createdTasks.length} succeeded, ${failedTasks.length} failed`);
    
    // Log any failures for debugging
    if (failedTasks.length > 0) {
      console.warn(`[SOW Upload] The following tasks failed to create:`);
      failedTasks.forEach((ft, index) => {
        console.warn(`  ${index + 1}. "${ft.title}": ${ft.error}`);
      });
    }
    
    // Always return success with details about what worked and what didn't
    const response: any = {
      ...project,
      tasksCreated: createdTasks.length,
      tasksFailed: failedTasks.length,
    };
    
    // Include failure details if there were any
    if (failedTasks.length > 0) {
      response.failedTasks = failedTasks;
      response.message = `Project created successfully. ${createdTasks.length} tasks saved, ${failedTasks.length} tasks failed.`;
    } else {
      response.message = `Project and all ${createdTasks.length} tasks created successfully.`;
    }
    
    res.status(201).json(response);
  } catch (error: any) {
    // This should only happen if the project itself fails to create
    console.error(`[SOW Upload] Failed to create project:`, error);
    throw createError.internal(`Failed to create project: ${error.message}`);
  }
}));

// Get custom fields for project
router.get('/:projectId/custom-fields', isAuthenticated, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const fields = await storage.getCustomFields(projectId);
  res.json(fields);
}));

// Get risks for project
router.get('/:projectId/risks', isAuthenticated, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const risks = await storage.getRisks(projectId);
  res.json(risks);
}));

// Get budget items for project
router.get('/:projectId/budget-items', isAuthenticated, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const items = await storage.getBudgetItems(projectId);
  res.json(items);
}));

// Get expenses for project
router.get('/:projectId/expenses', isAuthenticated, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const expenses = await storage.getExpenses(projectId);
  res.json(expenses);
}));

// Get automation rules for project
router.get('/:projectId/automation-rules', isAuthenticated, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const rules = await storage.getAutomationRules(projectId);
  res.json(rules);
}));

// Calculate and return critical path for a project
router.get('/:projectId/critical-path', isAuthenticated, asyncHandler(async (req: any, res) => {
  const { SchedulingEngine } = await import('../scheduling');
  const projectId = parseInt(req.params.projectId);
  const userId = req.user.claims.sub;
  
  const tasks = await storage.getTasks(projectId);
  const dependencies = await storage.getProjectDependencies(projectId);
  
  const scheduler = new SchedulingEngine(tasks, dependencies);
  const criticalPath = scheduler.calculateCriticalPath();
  const updatedTasks = scheduler.getUpdatedTasks();
  
  // Update critical path flags in database
  for (const task of updatedTasks) {
    if (task.isOnCriticalPath !== tasks.find(t => t.id === task.id)?.isOnCriticalPath) {
      await storage.updateTask(task.id, { isOnCriticalPath: task.isOnCriticalPath }, userId);
    }
  }
  
  res.json({
    criticalPath,
    criticalTasks: updatedTasks.filter(t => t.isOnCriticalPath),
  });
}));

export default router;