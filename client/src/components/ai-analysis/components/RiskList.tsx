/**
 * Risk List Component
 * Displays identified risks with collapsible details
 */
import { useState } from "react";
import { 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { IdentifiedRisk } from "../types";
import { getRiskLevelColor, getRiskLevelBadge, getRiskTypeIcon, getRiskTypeLabel } from "../utils";

interface RiskListProps {
  risks: IdentifiedRisk[];
  summary?: string;
}

export function RiskList({ risks, summary }: RiskListProps) {
  const [expandedRisks, setExpandedRisks] = useState<Set<number>>(new Set());

  const toggleRiskExpanded = (index: number) => {
    const newExpanded = new Set(expandedRisks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRisks(newExpanded);
  };

  if (risks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="font-medium">No Significant Risks Detected</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your project appears to be in good health with no critical risks identified.
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
          <AlertTriangle className="h-4 w-4" />
          Identified Risks ({risks.length})
        </CardTitle>
        {summary && (
          <CardDescription>{summary}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3">
            {risks.map((risk, index) => (
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
  );
}

