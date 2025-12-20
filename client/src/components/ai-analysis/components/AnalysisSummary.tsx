/**
 * Analysis Summary Component
 * Displays executive summary and key health metrics
 */
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp,
  Lightbulb 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ComprehensiveAnalysisResult } from "../types";
import { getRiskLevelBadge } from "../utils";

interface AnalysisSummaryProps {
  analysis: ComprehensiveAnalysisResult;
}

export function AnalysisSummary({ analysis }: AnalysisSummaryProps) {
  const healthScore = analysis.projectHealthScore;
  const healthColor = healthScore >= 80 
    ? 'text-emerald-500' 
    : healthScore >= 60 
    ? 'text-amber-500' 
    : healthScore >= 40 
    ? 'text-orange-500' 
    : 'text-red-500';

  return (
    <div className="space-y-6">
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

      {/* Risk Summary */}
      {analysis.riskAnalysis.summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Risk Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{analysis.riskAnalysis.summary}</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{analysis.riskAnalysis.identifiedRisks.length}</span>
                <span className="text-xs text-muted-foreground">risks identified</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{analysis.actionItems.length}</span>
                <span className="text-xs text-muted-foreground">action items</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

