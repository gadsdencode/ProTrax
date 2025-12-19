/**
 * Project Health Badge Component
 * 
 * A compact badge that displays project health score from AI analysis.
 * Can be used on project cards for quick health visualization.
 */
import { useQuery } from "@tanstack/react-query";
import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ProjectHealthData {
  projectId: number;
  projectName: string;
  healthScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  summary: string;
  quickStats: {
    total: number;
    completed: number;
    blocked: number;
    overdue: number;
  };
  topRisks: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
}

interface ProjectHealthBadgeProps {
  projectId: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ProjectHealthBadge({ projectId, showLabel = true, size = 'sm' }: ProjectHealthBadgeProps) {
  const { data, isLoading, error } = useQuery<ProjectHealthData>({
    queryKey: ['/api/ai/project-health', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/ai/project-health/${projectId}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch health');
      }
      return res.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

  if (isLoading) {
    return <Skeleton className={cn("rounded-full", size === 'sm' ? "h-5 w-16" : "h-6 w-20")} />;
  }

  if (error || !data) {
    return null; // Silently fail - health badge is optional
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300';
    if (score >= 60) return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    if (score >= 40) return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
  };

  const getTrendIcon = (score: number) => {
    if (score >= 70) return <TrendingUp className="h-3 w-3" />;
    if (score >= 50) return <Minus className="h-3 w-3" />;
    return <TrendingDown className="h-3 w-3" />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            className={cn(
              "gap-1 cursor-help font-medium",
              getHealthColor(data.healthScore),
              size === 'sm' ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1"
            )}
          >
            <Sparkles className={size === 'sm' ? "h-2.5 w-2.5" : "h-3 w-3"} />
            {data.healthScore}%
            {showLabel && size === 'md' && <span className="ml-1">Health</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Project Health:</span>
              <span className={cn(
                "font-bold",
                data.healthScore >= 80 ? "text-emerald-600" :
                data.healthScore >= 60 ? "text-amber-600" :
                data.healthScore >= 40 ? "text-orange-600" : "text-red-600"
              )}>
                {data.healthScore}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{data.summary}</p>
            <div className="text-xs space-y-1 pt-1 border-t">
              <div className="flex justify-between">
                <span>Tasks:</span>
                <span>{data.quickStats.completed}/{data.quickStats.total} done</span>
              </div>
              {data.quickStats.blocked > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Blocked:</span>
                  <span>{data.quickStats.blocked}</span>
                </div>
              )}
              {data.quickStats.overdue > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Overdue:</span>
                  <span>{data.quickStats.overdue}</span>
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

