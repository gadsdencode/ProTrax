/**
 * Type definitions for AI Risk Analysis
 */

export interface IdentifiedRisk {
  type: 'dependency_bottleneck' | 'deadline_pressure' | 'resource_overload' | 'scope_creep' | 'blocked_tasks' | 'unassigned_tasks' | 'missing_estimates';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedTasks: number[];
  recommendation: string;
}

export interface RiskAnalysisResult {
  projectId: number;
  projectName: string;
  analyzedAt: string;
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  identifiedRisks: IdentifiedRisk[];
  summary: string;
}

export interface TaskEstimate {
  taskId: number;
  taskTitle: string;
  suggestedStoryPoints: number | null;
  suggestedHours: number | null;
  confidence: number;
  reasoning: string;
}

export interface EffortEstimationResult {
  projectId: number;
  projectName: string;
  estimatedAt: string;
  tasksAnalyzed: number;
  taskEstimates: TaskEstimate[];
  teamVelocity: {
    averagePointsPerSprint: number;
    averageHoursPerTask: number;
    dataPointsUsed: number;
  };
  recommendations: string[];
}

export interface ActionItem {
  priority: 'high' | 'medium' | 'low';
  action: string;
  impact: string;
}

export interface ComprehensiveAnalysisResult {
  projectId: number;
  projectName: string;
  analyzedAt: string;
  taskCount: number;
  riskAnalysis: {
    overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    identifiedRisks: IdentifiedRisk[];
    summary: string;
  };
  effortEstimation: {
    taskEstimates: TaskEstimate[];
    teamVelocity: {
      averagePointsPerSprint: number;
      averageHoursPerTask: number;
      dataPointsUsed: number;
    };
    recommendations: string[];
  };
  projectHealthScore: number;
  actionItems: ActionItem[];
  executiveSummary: string;
}

// Helper function types
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskType = IdentifiedRisk['type'];
export type Priority = ActionItem['priority'];

// Selection state for estimates
export interface EstimateSelection {
  storyPoints?: number;
  hours?: number;
}

