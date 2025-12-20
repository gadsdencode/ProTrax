/**
 * Estimate Selector Component
 * Allows users to select and apply AI-suggested effort estimates
 */
import { 
  Clock,
  Check,
  X,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskEstimate, EstimateSelection } from "../types";

interface EstimateSelectorProps {
  estimates: TaskEstimate[];
  recommendations: string[];
  selectedEstimates: Map<number, EstimateSelection>;
  onToggleEstimate: (taskId: number, estimate: TaskEstimate) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onApply: () => void;
  isApplying: boolean;
  showDetails?: boolean;
  onToggleDetails?: () => void;
}

export function EstimateSelector({
  estimates,
  recommendations,
  selectedEstimates,
  onToggleEstimate,
  onSelectAll,
  onClearAll,
  onApply,
  isApplying,
  showDetails = false,
  onToggleDetails,
}: EstimateSelectorProps) {
  if (estimates.length === 0) {
    return (
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
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              AI Effort Estimates ({estimates.length})
            </CardTitle>
            <CardDescription>
              Select estimates to apply to your tasks
            </CardDescription>
          </div>
          {onToggleDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleDetails}
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          )}
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
                onClick={onSelectAll}
              >
                <Check className="h-4 w-4 mr-1" />
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedEstimates.size} of {estimates.length} selected
            </div>
          </div>

          {/* Estimates List */}
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {estimates.map((estimate) => (
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
                    onCheckedChange={() => onToggleEstimate(estimate.taskId, estimate)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{estimate.taskTitle}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        #{estimate.taskId}
                      </Badge>
                    </div>
                    {showDetails && (
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
          {recommendations.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
                💡 Estimation Tips
              </p>
              <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                {recommendations.map((rec, i) => (
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
            onClick={onApply}
            disabled={selectedEstimates.size === 0 || isApplying}
          >
            {isApplying ? (
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
  );
}

