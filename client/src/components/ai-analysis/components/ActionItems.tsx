/**
 * Action Items Component
 * Displays recommended actions to improve project health
 */
import { Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActionItem } from "../types";
import { getPriorityBadge } from "../utils";

interface ActionItemsProps {
  items: ActionItem[];
}

export function ActionItems({ items }: ActionItemsProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <Target className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="font-medium">No Action Items</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your project is on track with no immediate actions required.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          Recommended Actions ({items.length})
        </CardTitle>
        <CardDescription>
          Priority actions to improve project health
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div 
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
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

        {/* Priority Legend */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Priority Legend:</p>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Badge className={getPriorityBadge('high')}>high</Badge>
              <span className="text-xs text-muted-foreground">Immediate attention needed</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getPriorityBadge('medium')}>medium</Badge>
              <span className="text-xs text-muted-foreground">Address this sprint</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getPriorityBadge('low')}>low</Badge>
              <span className="text-xs text-muted-foreground">When time permits</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

