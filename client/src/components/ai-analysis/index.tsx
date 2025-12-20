/**
 * AI Risk Analysis Component
 * 
 * Main entry point that displays AI-powered project risk analysis results
 * organized in tabs for better information hierarchy.
 */
import { useState } from "react";
import { 
  Sparkles, 
  RefreshCw,
  Zap,
  AlertTriangle,
  Clock,
  Target
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAIAnalysis } from "./hooks/useAIAnalysis";
import { AnalysisSummary } from "./components/AnalysisSummary";
import { RiskList } from "./components/RiskList";
import { EstimateSelector } from "./components/EstimateSelector";
import { ActionItems } from "./components/ActionItems";

interface AIRiskAnalysisProps {
  projectId: number;
}

export function AIRiskAnalysis({ projectId }: AIRiskAnalysisProps) {
  const [showEstimateDetails, setShowEstimateDetails] = useState(false);
  
  const {
    analysis,
    isLoading,
    isFetching,
    error,
    refetch,
    selectedEstimates,
    toggleEstimateSelection,
    selectAllEstimates,
    clearAllEstimates,
    applySelectedEstimates,
    isApplyingEstimates,
  } = useAIAnalysis({ projectId });

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

  const riskCount = analysis.riskAnalysis.identifiedRisks.length;
  const estimateCount = analysis.effortEstimation.taskEstimates.length;
  const actionCount = analysis.actionItems.length;

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

      {/* Tabbed Interface */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="risks" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Risks</span>
            {riskCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {riskCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="estimates" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Estimates</span>
            {estimateCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {estimateCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Actions</span>
            {actionCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {actionCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AnalysisSummary analysis={analysis} />
        </TabsContent>

        <TabsContent value="risks" className="mt-6">
          <RiskList 
            risks={analysis.riskAnalysis.identifiedRisks}
            summary={analysis.riskAnalysis.summary}
          />
        </TabsContent>

        <TabsContent value="estimates" className="mt-6">
          <EstimateSelector
            estimates={analysis.effortEstimation.taskEstimates}
            recommendations={analysis.effortEstimation.recommendations}
            selectedEstimates={selectedEstimates}
            onToggleEstimate={toggleEstimateSelection}
            onSelectAll={selectAllEstimates}
            onClearAll={clearAllEstimates}
            onApply={applySelectedEstimates}
            isApplying={isApplyingEstimates}
            showDetails={showEstimateDetails}
            onToggleDetails={() => setShowEstimateDetails(!showEstimateDetails)}
          />
        </TabsContent>

        <TabsContent value="actions" className="mt-6">
          <ActionItems items={analysis.actionItems} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Re-export for backwards compatibility
export { AIRiskAnalysis as default };

