// Gemini AI integration from javascript_gemini blueprint
import { GoogleGenAI } from "@google/genai";

// DON'T DELETE THIS COMMENT
// the newest Gemini model series is "gemini-2.5-flash" or "gemini-2.5-pro"
// do not change this unless explicitly requested by the user

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

export async function predictProjectDeadline(taskData: any[]): Promise<{
  prediction: string;
  confidence: number;
  riskFactors: string[];
}> {
  try {
    const systemPrompt = `You are a project management AI analyzing task completion patterns. 
Based on the provided task data, predict if the project will meet its deadline.
Respond with JSON in this format: 
{
  'prediction': 'on-time' | 'delayed' | 'at-risk',
  'confidence': number (0-1),
  'riskFactors': string[]
}`;

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
      contents: JSON.stringify(taskData),
    });

    const rawJson = response.text;
    if (rawJson) {
      return JSON.parse(rawJson);
    } else {
      throw new Error("Empty response from model");
    }
  } catch (error) {
    console.error("Error predicting deadline:", error);
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
