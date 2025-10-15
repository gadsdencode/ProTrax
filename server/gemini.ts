// Gemini AI integration from javascript_gemini blueprint
import { GoogleGenAI } from "@google/genai";
import { db } from "./db";
import { tasks, timeEntries, projects, users } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

// DON'T DELETE THIS COMMENT
// the newest Gemini model series is "gemini-2.5-flash" or "gemini-2.5-pro"
// do not change this unless explicitly requested by the user

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Retry configuration for handling API overload errors
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // Start with 1 second delay
const BACKOFF_FACTOR = 2; // Double the delay each time

// Helper function to sleep for a given number of milliseconds
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Wrapper function to handle retries with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  operationName: string = "AI operation"
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a retryable error (503 or overloaded message)
      const isRetryable = 
        error.status === 503 || 
        error.message?.toLowerCase().includes('overloaded') ||
        error.message?.toLowerCase().includes('unavailable');
      
      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = INITIAL_DELAY * Math.pow(BACKOFF_FACTOR, attempt - 1);
        console.log(`[${operationName}] Attempt ${attempt} failed with overload error. Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      
      // Non-retryable error or max retries reached
      break;
    }
  }
  
  // If we've exhausted retries, throw the last error
  console.error(`[${operationName}] Failed after ${MAX_RETRIES} attempts:`, lastError);
  throw lastError;
}

interface UserPerformanceData {
  userId: string;
  userName: string;
  totalTasksCompleted: number;
  totalTasksAssigned: number;
  completionRate: number;
  averageTimeAccuracy: number;
  totalEstimatedHours: number;
  totalActualHours: number;
}

interface PreviousProjectData {
  projectId: number;
  projectName: string;
  status: string;
  wasOnTime: boolean;
  tasksCompleted: number;
  tasksTotal: number;
  budgetPlanned: string | null;
  budgetUsed: string | null;
}

async function getUserPerformanceData(userIds: string[]): Promise<UserPerformanceData[]> {
  if (userIds.length === 0) return [];

  const performanceData: UserPerformanceData[] = [];

  for (const userId of userIds) {
    // Get user info
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) continue;

    // Get all tasks assigned to this user
    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.assigneeId, userId));

    const completedTasks = userTasks.filter(t => t.status === 'done');
    const totalEstimated = userTasks.reduce((sum, t) => sum + parseFloat(t.estimatedHours || '0'), 0);

    // Get time entries for this user
    const userTimeEntries = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.userId, userId));

    const totalActual = userTimeEntries.reduce((sum, t) => sum + parseFloat(t.hours), 0);

    // Calculate time accuracy (how close actual vs estimated)
    const timeAccuracy = totalEstimated > 0 
      ? Math.abs(1 - (totalActual / totalEstimated)) 
      : 0;

    performanceData.push({
      userId,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown',
      totalTasksCompleted: completedTasks.length,
      totalTasksAssigned: userTasks.length,
      completionRate: userTasks.length > 0 ? completedTasks.length / userTasks.length : 0,
      averageTimeAccuracy: timeAccuracy,
      totalEstimatedHours: totalEstimated,
      totalActualHours: totalActual,
    });
  }

  return performanceData;
}

async function getPreviousProjectsData(): Promise<PreviousProjectData[]> {
  // Get completed projects
  const completedProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.status, 'completed'))
    .orderBy(desc(projects.updatedAt))
    .limit(5);

  const projectsData: PreviousProjectData[] = [];

  for (const project of completedProjects) {
    // Get all tasks for this project
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, project.id));

    const completedTasks = projectTasks.filter(t => t.status === 'done');

    // Determine if project was on time
    const wasOnTime = project.endDate 
      ? new Date(project.updatedAt!) <= new Date(project.endDate)
      : false;

    projectsData.push({
      projectId: project.id,
      projectName: project.name,
      status: project.status || 'unknown',
      wasOnTime,
      tasksCompleted: completedTasks.length,
      tasksTotal: projectTasks.length,
      budgetPlanned: project.budget,
      budgetUsed: null, // Could be calculated from expenses if needed
    });
  }

  return projectsData;
}

export async function generateProjectSummary(projectData: any): Promise<string> {
  const prompt = `Generate a concise executive summary for this project:
  
Name: ${projectData.name}
Description: ${projectData.description}
Status: ${projectData.status}
Budget: ${projectData.budget}
Timeline: ${projectData.startDate} to ${projectData.endDate}

Provide a 2-3 paragraph summary highlighting key objectives, current status, and any notable points.`;

  try {
    const response = await retryWithBackoff(
      async () => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      }),
      "generateProjectSummary"
    );

    return response.text || "Unable to generate summary";
  } catch (error: any) {
    console.error("Error generating project summary (after retries):", error);
    return "Unable to generate summary at this time";
  }
}

export async function predictProjectDeadline(
  taskData: any[],
  projectData?: any
): Promise<{
  prediction: string;
  confidence: number;
  riskFactors: string[];
}> {
  try {
    // Extract unique assignee IDs from tasks
    const assigneeIds = Array.from(new Set(taskData.map(t => t.assigneeId).filter(Boolean)));
    
    // Gather historical performance data
    const userPerformance = await getUserPerformanceData(assigneeIds);
    const previousProjects = await getPreviousProjectsData();

    // Build enriched prompt with historical context
    const systemPrompt = `You are a project management AI with access to historical performance data.
Analyze the task data, team performance history, and previous project outcomes to predict if the project will meet its deadline.

Consider:
- Task complexity, dependencies, and current progress
- Historical performance of assigned team members
- Patterns from similar completed projects
- Resource capacity and allocation

Respond with JSON in this format: 
{
  'prediction': 'on-time' | 'delayed' | 'at-risk',
  'confidence': number (0-1),
  'riskFactors': string[]
}`;

    // Build comprehensive context
    const contextData = {
      currentProject: projectData || {},
      tasks: taskData,
      teamPerformance: userPerformance.map(perf => ({
        name: perf.userName,
        completionRate: `${(perf.completionRate * 100).toFixed(1)}%`,
        tasksCompleted: `${perf.totalTasksCompleted}/${perf.totalTasksAssigned}`,
        estimatedVsActual: `${perf.totalEstimatedHours.toFixed(1)}h estimated vs ${perf.totalActualHours.toFixed(1)}h actual`,
        timeAccuracy: `${((1 - perf.averageTimeAccuracy) * 100).toFixed(1)}% accurate`,
      })),
      historicalProjects: previousProjects.map(proj => ({
        name: proj.projectName,
        outcome: proj.wasOnTime ? 'completed on-time' : 'completed late',
        taskCompletion: `${proj.tasksCompleted}/${proj.tasksTotal} tasks`,
        budget: proj.budgetPlanned ? `$${proj.budgetPlanned}` : 'N/A',
      })),
      statistics: {
        totalTasksInProject: taskData.length,
        completedTasks: taskData.filter(t => t.status === 'done').length,
        inProgressTasks: taskData.filter(t => t.status === 'in_progress').length,
        blockedTasks: taskData.filter(t => t.status === 'blocked').length,
        teamSize: assigneeIds.length,
        avgTeamCompletionRate: userPerformance.length > 0
          ? `${(userPerformance.reduce((sum, p) => sum + p.completionRate, 0) / userPerformance.length * 100).toFixed(1)}%`
          : 'N/A',
      }
    };

    // Use retry wrapper for the API call
    const response = await retryWithBackoff(
      async () => ai.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              prediction: { type: "string" },
              confidence: { type: "number" },
              riskFactors: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["prediction", "confidence", "riskFactors"],
          },
        },
        contents: JSON.stringify(contextData, null, 2),
      }),
      "predictProjectDeadline"
    );

    const rawJson = response.text;
    if (rawJson) {
      return JSON.parse(rawJson);
    } else {
      throw new Error("Empty response from model");
    }
  } catch (error: any) {
    console.error("Error predicting deadline (after retries):", error);
    
    // Return a graceful fallback instead of throwing
    return {
      prediction: "unknown",
      confidence: 0,
      riskFactors: ["Unable to analyze at this time - AI service temporarily unavailable"],
    };
  }
}

export async function summarizeComments(comments: any[]): Promise<string> {
  if (comments.length === 0) {
    return "No comments to summarize";
  }

  const prompt = `Summarize the following comment thread from a project management task:

${comments.map((c, i) => `${i + 1}. ${c.content}`).join('\n\n')}

Provide a concise summary highlighting:
- Key discussion points
- Decisions made
- Action items
- Any blockers or concerns`;

  try {
    const response = await retryWithBackoff(
      async () => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      }),
      "summarizeComments"
    );

    return response.text || "Unable to summarize comments";
  } catch (error: any) {
    console.error("Error summarizing comments (after retries):", error);
    return "Unable to summarize comments at this time";
  }
}

export async function assessRisk(riskDescription: string): Promise<{
  probability: string;
  impact: string;
  score: number;
  mitigation: string;
}> {
  try {
    const systemPrompt = `You are a risk assessment expert. Analyze the risk and provide:
- probability: 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
- impact: 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
- score: number (1-25, calculated as probability_value * impact_value where each level = 1-5)
- mitigation: brief mitigation strategy

Respond with JSON in this format: 
{
  'probability': string,
  'impact': string,
  'score': number,
  'mitigation': string
}`;

    const response = await retryWithBackoff(
      async () => ai.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              probability: { type: "string" },
              impact: { type: "string" },
              score: { type: "number" },
              mitigation: { type: "string" },
            },
            required: ["probability", "impact", "score", "mitigation"],
          },
        },
        contents: riskDescription,
      }),
      "assessRisk"
    );

    const rawJson = response.text;
    if (rawJson) {
      return JSON.parse(rawJson);
    } else {
      throw new Error("Empty response from model");
    }
  } catch (error) {
    console.error("Error assessing risk (after retries):", error);
    return {
      probability: "medium",
      impact: "medium",
      score: 9,
      mitigation: "Unable to generate mitigation strategy",
    };
  }
}

export async function extractProjectDataFromSOW(
  sowText: string
): Promise<{
  name: string;
  description?: string;
  charter?: string;
  startDate?: string;
  endDate?: string;
  budget?: string;
  tasks?: Array<{
    title: string;
    description: string;
    isMilestone: boolean;
  }>;
}> {
  try {
    console.log(`[Gemini Extraction] Starting extraction from ${sowText.length} characters of text`);
    console.log(`[Gemini Extraction] Text preview: ${sowText.substring(0, 200)}...`);
    
    const prompt = `You are an expert at analyzing Statement of Work (SOW) documents. Extract comprehensive project information from the following document.

DOCUMENT TEXT:
${sowText}

EXTRACTION REQUIREMENTS:
1. Extract a clear project name (max 255 characters)
2. Create a comprehensive description summarizing the project scope
3. Extract start and end dates if mentioned (format: YYYY-MM-DD)
4. Extract budget if mentioned (as decimal number)
5. MOST IMPORTANT: Extract ALL tasks, activities, and deliverables:
   - Every numbered or bulleted item describing work
   - All phases, stages, or workstreams
   - Each deliverable, output, or outcome
   - Any activities, steps, or processes
   - All milestones, checkpoints, or review points
   - Documentation tasks, training, meetings
   - Setup, configuration, installation tasks
   - Any item with action verbs (create, develop, test, review, etc.)

Look for patterns like:
- Numbered lists (1., 2., 3.)
- Bullet points (•, -, *)
- Sections like "Deliverables:", "Tasks:", "Scope:"
- Phase descriptions (Phase 1, Stage 2, etc.)
- Timeline sections
- Work breakdown structures

Mark items as milestones if they are:
- Major deliverable completions
- End of phases
- Key review/approval points
- Critical checkpoints

Provide your response as a valid JSON object with this exact structure:
{
  "name": "Project name here",
  "description": "Project description here",
  "charter": "Optional project charter",
  "startDate": "YYYY-MM-DD or null",
  "endDate": "YYYY-MM-DD or null",
  "budget": "50000 or null",
  "tasks": [
    {
      "title": "Task title",
      "description": "Task description",
      "isMilestone": false
    }
  ]
}

Be thorough - extract EVERY work item. It's better to have too many tasks than too few.`;

    const response = await retryWithBackoff(
      async () => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      }),
      "extractProjectDataFromSOW"
    );
    
    const text = response.text || "";
    
    console.log(`[Gemini Extraction] Got response from Gemini API`);
    console.log(`[Gemini Extraction] Raw response: ${text}`);
    
    // Clean the response text to extract JSON
    let jsonText = text;
    
    // Try to extract JSON from markdown code blocks if present
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }
    
    console.log(`[Gemini Extraction] Cleaned JSON: ${jsonText}`);
    
    try {
      const parsedData = JSON.parse(jsonText);
      
      // Validate and clean the extracted data
      if (!parsedData.name || parsedData.name.trim() === '') {
        parsedData.name = 'Untitled Project';
      }
      
      // Clean project name (max 255 chars for DB)
      parsedData.name = parsedData.name.substring(0, 255).replace(/[\x00-\x1F\x7F]/g, '').trim();
      
      // Ensure tasks array exists and clean each task
      if (!parsedData.tasks || !Array.isArray(parsedData.tasks)) {
        parsedData.tasks = [];
      } else {
        // Clean and validate each task
        parsedData.tasks = parsedData.tasks.map((task: any, index: number) => {
          // Ensure task has a title
          let title = task.title || task.name || task.task || '';
          title = String(title).replace(/[\x00-\x1F\x7F]/g, '').trim();
          
          // If still no title, create one
          if (!title) {
            title = `Task ${index + 1}`;
          }
          
          // Ensure title isn't too long (max 500 chars for DB)
          if (title.length > 500) {
            console.warn(`[SOW Extraction] Task ${index + 1} title truncated from ${title.length} to 500 chars`);
            title = title.substring(0, 497) + '...';
          }
          
          // Clean description
          let description = task.description || '';
          description = String(description).replace(/[\x00-\x1F\x7F]/g, '').trim();
          
          // Ensure isMilestone is a boolean
          const isMilestone = Boolean(task.isMilestone || task.milestone || false);
          
          return {
            title,
            description,
            isMilestone
          };
        }).filter((task: any) => task.title); // Remove any tasks without titles
      }
      
      // Log the extraction results for debugging
      console.log(`[SOW Extraction] Extracted and cleaned project: ${parsedData.name}`);
      console.log(`[SOW Extraction] Number of valid tasks: ${parsedData.tasks?.length || 0}`);
      if (parsedData.tasks && parsedData.tasks.length > 0) {
        console.log(`[SOW Extraction] Task titles: ${parsedData.tasks.map((t: any) => t.title).join(', ')}`);
      }
      
      // Validate and format dates if present
      if (parsedData.startDate && parsedData.startDate !== 'null') {
        const startDate = new Date(parsedData.startDate);
        if (!isNaN(startDate.getTime())) {
          parsedData.startDate = startDate.toISOString().split('T')[0];
        } else {
          delete parsedData.startDate;
        }
      } else {
        delete parsedData.startDate;
      }
      
      if (parsedData.endDate && parsedData.endDate !== 'null') {
        const endDate = new Date(parsedData.endDate);
        if (!isNaN(endDate.getTime())) {
          parsedData.endDate = endDate.toISOString().split('T')[0];
        } else {
          delete parsedData.endDate;
        }
      } else {
        delete parsedData.endDate;
      }
      
      // Ensure budget is a valid decimal string if present
      if (parsedData.budget && parsedData.budget !== 'null') {
        const budgetNum = parseFloat(parsedData.budget.toString().replace(/[^0-9.-]/g, ''));
        if (!isNaN(budgetNum)) {
          parsedData.budget = budgetNum.toFixed(2);
        } else {
          delete parsedData.budget;
        }
      } else {
        delete parsedData.budget;
      }
      
      // Ensure we have at least some basic structure
      if (!parsedData.name || parsedData.name.trim() === '') {
        throw new Error("No project name could be extracted from the document");
      }
      
      // Log warning if no tasks were extracted
      if (!parsedData.tasks || parsedData.tasks.length === 0) {
        console.warn('[SOW Extraction] WARNING: No tasks were extracted from the SOW document. The document may need better formatting or clearer task definitions.');
      }
      
      return parsedData;
    } catch (parseError) {
      console.error(`[Gemini Extraction] Failed to parse JSON response:`, parseError);
      console.error(`[Gemini Extraction] Raw text was:`, jsonText);
      
      // Try to create a minimal project if we can extract a name
      const nameMatch = sowText.match(/project[:\s]+([^\n]+)/i);
      if (nameMatch) {
        return {
          name: nameMatch[1].trim().substring(0, 255),
          description: "Project extracted from SOW document",
          tasks: []
        };
      }
      
      throw new Error("Unable to parse the AI response. The document format may not be supported.");
    }
  } catch (error: any) {
    console.error("Error extracting project data from SOW:", error);
    
    // Provide more specific error messages based on the error type
    if (error.message?.includes('overloaded') || error.status === 503) {
      throw new Error("The AI service is temporarily overloaded. Please try again in a moment.");
    } else if (error.message?.includes('API key')) {
      throw new Error("AI service configuration error. Please contact support.");
    } else if (error.message?.includes('No project name')) {
      throw error; // Re-throw our custom error
    } else {
      throw new Error("Unable to extract complete project data from the SOW. Please ensure the document contains clear project information with tasks, deliverables, and milestones clearly outlined.");
    }
  }
}
