// Gemini AI integration from javascript_gemini blueprint
import { GoogleGenAI } from "@google/genai";
import { db } from "./db";
import { tasks, timeEntries, projects, users } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

// DON'T DELETE THIS COMMENT
// the newest Gemini model series is "gemini-2.5-flash" or "gemini-2.5-pro"
// do not change this unless explicitly requested by the user

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || "Unable to generate summary";
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

    const response = await ai.models.generateContent({
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
    });

    const rawJson = response.text;
    if (rawJson) {
      return JSON.parse(rawJson);
    } else {
      throw new Error("Empty response from model");
    }
  } catch (error: any) {
    console.error("Error predicting deadline:", error);
    
    // Check if it's an API overload error
    if (error.message?.includes('overloaded') || error.status === 503) {
      throw new Error("AI service is temporarily overloaded. Please try again in a moment.");
    }
    
    return {
      prediction: "unknown",
      confidence: 0,
      riskFactors: ["Unable to analyze - insufficient data"],
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

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || "Unable to summarize comments";
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

    const response = await ai.models.generateContent({
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
    });

    const rawJson = response.text;
    if (rawJson) {
      return JSON.parse(rawJson);
    } else {
      throw new Error("Empty response from model");
    }
  } catch (error) {
    console.error("Error assessing risk:", error);
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
    const systemPrompt = `You are an expert at analyzing Statement of Work (SOW) documents and extracting COMPREHENSIVE project information.
Your goal is to extract EVERY SINGLE task, activity, deliverable, and milestone from the SOW document. Be THOROUGH and EXHAUSTIVE.

CRITICAL EXTRACTION RULES:
1. Extract a clear project name (max 255 characters)
2. Create a comprehensive description summarizing the project scope and objectives
3. Generate a detailed project charter that includes: project goals, scope, deliverables, assumptions, constraints, and success criteria
4. Extract start and end dates if mentioned (format: YYYY-MM-DD)
5. Extract the budget if mentioned (as a decimal number, without currency symbols)
6. MOST IMPORTANT: Extract ALL tasks, activities, and deliverables. Look for:
   - Every numbered or bulleted item that describes work to be done
   - All phases, stages, or workstreams mentioned
   - Each deliverable, output, or outcome described
   - Any activities, steps, or processes outlined
   - All milestones, checkpoints, or review points
   - Any subtasks or sub-activities mentioned
   - Requirements gathering, analysis, design, development, testing, deployment activities
   - Documentation tasks, training activities, meetings, reviews
   - Setup, configuration, or installation tasks
   - Research, investigation, or discovery activities
   - Any task that has a verb (create, develop, design, implement, test, review, approve, etc.)

EXTRACTION PATTERNS TO LOOK FOR:
- Numbered lists (1., 2., 3. or 1.1, 1.2, etc.)
- Bullet points (•, -, *, etc.)
- Sections like "Deliverables:", "Tasks:", "Activities:", "Scope:", "Work Breakdown:"
- Phase descriptions (Phase 1, Stage 2, Sprint 1, etc.)
- Timeline or schedule sections
- Responsibility matrices or RACI charts
- Any sentence starting with action verbs

MILESTONE IDENTIFICATION:
- Mark as milestone (isMilestone: true) if it's:
  - A major deliverable completion
  - End of a phase or stage
  - Key review or approval point
  - Critical checkpoint or gate
  - Major document or report delivery
- Regular tasks and ongoing activities should be isMilestone: false

OUTPUT REQUIREMENTS:
- Generate a task for EVERY work item found, even if it seems minor
- Each task must have a clear, specific title (not generic)
- Include detailed descriptions explaining what needs to be done
- When in doubt, extract it as a task - it's better to have too many than too few
- If the SOW mentions "including but not limited to", generate tasks for the examples given

Respond with JSON in this format:
{
  "name": string (required),
  "description": string (optional),
  "charter": string (optional, rich text with line breaks),
  "startDate": string (optional, YYYY-MM-DD format),
  "endDate": string (optional, YYYY-MM-DD format),
  "budget": string (optional, decimal number as string),
  "tasks": array of {
    "title": string,
    "description": string,
    "isMilestone": boolean
  } (optional but should have many items)
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            charter: { type: "string" },
            startDate: { type: "string" },
            endDate: { type: "string" },
            budget: { type: "string" },
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  isMilestone: { type: "boolean" }
                },
                required: ["title", "description", "isMilestone"]
              }
            }
          },
          required: ["name"],
        },
      },
      contents: sowText,
    });

    const rawJson = response.text;
    if (rawJson) {
      const parsedData = JSON.parse(rawJson);
      
      // Log the extraction results for debugging
      console.log(`[SOW Extraction] Extracted project: ${parsedData.name}`);
      console.log(`[SOW Extraction] Number of tasks extracted: ${parsedData.tasks?.length || 0}`);
      
      // Validate and format dates if present
      if (parsedData.startDate) {
        const startDate = new Date(parsedData.startDate);
        if (!isNaN(startDate.getTime())) {
          parsedData.startDate = startDate.toISOString().split('T')[0];
        } else {
          delete parsedData.startDate;
        }
      }
      
      if (parsedData.endDate) {
        const endDate = new Date(parsedData.endDate);
        if (!isNaN(endDate.getTime())) {
          parsedData.endDate = endDate.toISOString().split('T')[0];
        } else {
          delete parsedData.endDate;
        }
      }
      
      // Ensure budget is a valid decimal string if present
      if (parsedData.budget) {
        const budgetNum = parseFloat(parsedData.budget.replace(/[^0-9.-]/g, ''));
        if (!isNaN(budgetNum)) {
          parsedData.budget = budgetNum.toFixed(2);
        } else {
          delete parsedData.budget;
        }
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
    } else {
      throw new Error("Empty response from model");
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
