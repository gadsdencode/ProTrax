/**
 * AI Risk Analysis Component
 * 
 * Displays AI-powered project risk analysis results and allows users
 * to accept or reject suggested effort estimates for tasks.
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Zap, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  Users,
  AlertCircle,
  Check,
  X,
  Lightbulb,
  Activity
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, handleMutationError } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// ============= TYPE DEFINITIONS =============

interface IdentifiedRisk {
  type: 'dependency_bottleneck' | 'deadline_pressure' | 'resource_overload' | 'scope_creep' | 'blocked_tasks' | 'unassigned_tasks' | 'missing_estimates';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedTasks: number[];
  recommendation: string;
}

interface RiskAnalysisResult {
  projectId: number;
  projectName: string;
  analyzedAt: string;
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  identifiedRisks: IdentifiedRisk[];
  summary: string;
}

interface TaskEstimate {
  taskId: number;
  taskTitle: string;
  suggestedStoryPoints: number | null;
  suggestedHours: number | null;
  confidence: number;
  reasoning: string;
}

interface EffortEstimationResult {
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

interface ActionItem {
  priority: 'high' | 'medium' | 'low';
  action: string;
  impact: string;
}

interface ComprehensiveAnalysisResult {
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

// ============= HELPER FUNCTIONS =============

const getRiskLevelColor = (level: string) => {
  switch (level) {
    case 'low': return 'bg-emerald-500';
    case 'medium': return 'bg-amber-500';
    case 'high': return 'bg-orange-500';
    case 'critical': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getRiskLevelBadge = (level: string) => {
  switch (level) {
    case 'low': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    case 'medium': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'medium': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getRiskTypeIcon = (type: string) => {
  switch (type) {
    case 'dependency_bottleneck': return <Target className="h-4 w-4" />;
    case 'deadline_pressure': return <Clock className="h-4 w-4" />;
    case 'resource_overload': return <Users className="h-4 w-4" />;
    case 'scope_creep': return <TrendingUp className="h-4 w-4" />;
    case 'blocked_tasks': return <AlertCircle className="h-4 w-4" />;
    case 'unassigned_tasks': return <Users className="h-4 w-4" />;
    case 'missing_estimates': return <Activity className="h-4 w-4" />;
    default: return <AlertTriangle className="h-4 w-4" />;
  }
};

const getRiskTypeLabel = (type: string) => {
  switch (type) {
    case 'dependency_bottleneck': return 'Dependency Bottleneck';
    case 'deadline_pressure': return 'Deadline Pressure';
    case 'resource_overload': return 'Resource Overload';
    case 'scope_creep': return 'Scope Creep';
    case 'blocked_tasks': return 'Blocked Tasks';
    case 'unassigned_tasks': return 'Unassigned Tasks';
    case 'missing_estimates': return 'Missing Estimates';
    default: return type;
  }
};

// ============= COMPONENT =============

interface AIRiskAnalysisProps {
  projectId: number;
}

export function AIRiskAnalysis({ projectId }: AIRiskAnalysisProps) {
  const { toast } = useToast();
  const [expandedRisks, setExpandedRisks] = useState<Set<number>>(new Set());
  const [selectedEstimates, setSelectedEstimates] = useState<Map<number, { storyPoints?: number; hours?: number }>>(new Map());
  const [showEstimateDetails, setShowEstimateDetails] = useState(false);

  // Comprehensive analysis query
  const { 
    data: analysis, 
    isLoading, 
    error, 
    refetch, 
    isFetching 
  } = useQuery<ComprehensiveAnalysisResult>({
    queryKey: ['/api/ai/comprehensive-analysis', projectId],
    queryFn: async () => {
      const res = await fetch('/api/ai/comprehensive-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
        credentials: 'include',
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to run AI analysis');
      }
      return res.json();
    },
    enabled: false, // Don't auto-run, let user trigger it
    staleTime: 5 * 60 * 1000, // Consider stale after 5 minutes
  });

  // Apply estimates mutation
  const applyEstimatesMutation = useMutation({
    mutationFn: async (estimates: Array<{ taskId: number; storyPoints?: number; estimatedHours?: number }>) => {
      return await apiRequest('POST', '/api/ai/apply-estimates', { estimates });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/paginated'] });
      toast({
        title: "Estimates Applied",
        description: data.message || `Successfully updated ${data.updated} task(s)`,
      });
      setSelectedEstimates(new Map());
    },
    onError: handleMutationError,
  });

  const toggleRiskExpanded = (index: number) => {
    const newExpanded = new Set(expandedRisks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRisks(newExpanded);
  };

  const toggleEstimateSelection = (taskId: number, estimate: TaskEstimate) => {
    const newSelected = new Map(selectedEstimates);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.set(taskId, {
        storyPoints: estimate.suggestedStoryPoints ?? undefined,
        hours: estimate.suggestedHours ?? undefined,
      });
    }
    setSelectedEstimates(newSelected);
  };

  const selectAllEstimates = () => {
    if (!analysis?.effortEstimation?.taskEstimates) return;
    
    const newSelected = new Map<number, { storyPoints?: number; hours?: number }>();
    analysis.effortEstimation.taskEstimates.forEach(est => {
      newSelected.set(est.taskId, {
        storyPoints: est.suggestedStoryPoints ?? undefined,
        hours: est.suggestedHours ?? undefined,
      });
    });
    setSelectedEstimates(newSelected);
  };

  const clearAllEstimates = () => {
    setSelectedEstimates(new Map());
  };

  const applySelectedEstimates = () => {
    const estimates = Array.from(selectedEstimates.entries()).map(([taskId, values]) => ({
      taskId,
      storyPoints: values.storyPoints,
      estimatedHours: values.hours,
    }));
    applyEstimatesMutation.mutate(estimates);
  };

  // Loading state
  if (isLoading || isFetching) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <span className="text-lg font-medium">Running AI Analysis...</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  // No analysis run yet
  if (!analysis) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI-Powered Project Analysis</h3>
              <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                Get intelligent insights about potential risks, effort estimates, and actionable recommendations for your project.
              </p>
            </div>
            <Button 
              onClick={() => refetch()}
              size="lg"
              className="mt-4"
              disabled={isFetching}
            >
              <Zap className="h-4 w-4 mr-2" />
              Run AI Analysis
            </Button>
            {error && (
              <p className="text-sm text-destructive mt-2">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const healthScore = analysis.projectHealthScore;
  const healthColor = healthScore >= 80 ? 'text-emerald-500' : healthScore >= 60 ? 'text-amber-500' : healthScore >= 40 ? 'text-orange-500' : 'text-red-500';

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-lg font-medium">AI Project Analysis</span>
          <Badge variant="outline" className="text-xs">
            {new Date(analysis.analyzedAt).toLocaleString()}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
          Refresh Analysis
        </Button>
      </div>

      {/* Executive Summary */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{analysis.executiveSummary}</p>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Health Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Project Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-bold", healthColor)}>
              {healthScore}%
            </div>
            <Progress value={healthScore} className="mt-2 h-2" />
          </CardContent>
        </Card>

        {/* Risk Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risk Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold">{analysis.riskAnalysis.riskScore}</div>
              <Badge className={getRiskLevelBadge(analysis.riskAnalysis.overallRiskLevel)}>
                {analysis.riskAnalysis.overallRiskLevel.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Analyzed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Tasks Analyzed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analysis.taskCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.effortEstimation.taskEstimates.length} need estimates
            </p>
          </CardContent>
        </Card>

        {/* Team Velocity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Team Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analysis.effortEstimation.teamVelocity.averagePointsPerSprint.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              avg points/sprint
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      {analysis.actionItems && analysis.actionItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Recommended Actions
            </CardTitle>
            <CardDescription>
              Priority actions to improve project health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.actionItems.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <Badge className={cn("mt-0.5 shrink-0", getPriorityBadge(item.priority))}>
                    {item.priority}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Details */}
      {analysis.riskAnalysis.identifiedRisks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Identified Risks ({analysis.riskAnalysis.identifiedRisks.length})
            </CardTitle>
            <CardDescription>
              {analysis.riskAnalysis.summary}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {analysis.riskAnalysis.identifiedRisks.map((risk, index) => (
                  <Collapsible 
                    key={index}
                    open={expandedRisks.has(index)}
                    onOpenChange={() => toggleRiskExpanded(index)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", getRiskLevelColor(risk.severity))} />
                        <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                          {getRiskTypeIcon(risk.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{getRiskTypeLabel(risk.type)}</span>
                            <Badge variant="outline" className={getRiskLevelBadge(risk.severity)}>
                              {risk.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {risk.description}
                          </p>
                        </div>
                        {expandedRisks.has(index) ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 ml-6 p-3 rounded-lg bg-muted/30 space-y-2">
                        <p className="text-sm">{risk.description}</p>
                        <Separator />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Recommendation:</p>
                          <p className="text-sm">{risk.recommendation}</p>
                        </div>
                        {risk.affectedTasks.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Affected Tasks: {risk.affectedTasks.length}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {risk.affectedTasks.slice(0, 5).map(taskId => (
                                <Badge key={taskId} variant="outline" className="text-xs">
                                  #{taskId}
                                </Badge>
                              ))}
                              {risk.affectedTasks.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{risk.affectedTasks.length - 5} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Effort Estimates */}
      {analysis.effortEstimation.taskEstimates.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  AI Effort Estimates ({analysis.effortEstimation.taskEstimates.length})
                </CardTitle>
                <CardDescription>
                  Select estimates to apply to your tasks
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEstimateDetails(!showEstimateDetails)}
                >
                  {showEstimateDetails ? 'Hide Details' : 'Show Details'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Selection Controls */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllEstimates}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllEstimates}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedEstimates.size} of {analysis.effortEstimation.taskEstimates.length} selected
                </div>
              </div>

              {/* Estimates List */}
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {analysis.effortEstimation.taskEstimates.map((estimate) => (
                    <div 
                      key={estimate.taskId}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-lg border transition-colors",
                        selectedEstimates.has(estimate.taskId) 
                          ? "bg-primary/5 border-primary/30" 
                          : "hover:bg-muted/50"
                      )}
                    >
                      <Switch
                        checked={selectedEstimates.has(estimate.taskId)}
                        onCheckedChange={() => toggleEstimateSelection(estimate.taskId, estimate)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{estimate.taskTitle}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            #{estimate.taskId}
                          </Badge>
                        </div>
                        {showEstimateDetails && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {estimate.reasoning}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {estimate.suggestedStoryPoints !== null && (
                          <div className="text-center">
                            <div className="text-lg font-semibold">{estimate.suggestedStoryPoints}</div>
                            <div className="text-xs text-muted-foreground">Points</div>
                          </div>
                        )}
                        {estimate.suggestedHours !== null && (
                          <div className="text-center">
                            <div className="text-lg font-semibold">{estimate.suggestedHours}h</div>
                            <div className="text-xs text-muted-foreground">Hours</div>
                          </div>
                        )}
                        <div className="text-center">
                          <div className="text-sm font-medium">
                            {Math.round(estimate.confidence * 100)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Confidence</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Recommendations */}
              {analysis.effortEstimation.recommendations.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
                    💡 Estimation Tips
                  </p>
                  <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                    {analysis.effortEstimation.recommendations.map((rec, i) => (
                      <li key={i}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <p className="text-sm text-muted-foreground">
                Apply AI-suggested estimates to selected tasks
              </p>
              <Button
                onClick={applySelectedEstimates}
                disabled={selectedEstimates.size === 0 || applyEstimatesMutation.isPending}
              >
                {applyEstimatesMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Apply {selectedEstimates.size} Estimate{selectedEstimates.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* No estimates needed */}
      {analysis.effortEstimation.taskEstimates.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-medium">All Tasks Have Estimates</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Great job! All tasks in this project already have effort estimates.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

