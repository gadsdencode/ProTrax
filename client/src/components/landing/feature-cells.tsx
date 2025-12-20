import { cn } from "@/lib/utils";
import { featureCardVariants, type FeatureCardVariants } from "./card-variants";
import { GanttPreview } from "./gantt-preview";
import { KanbanPreview } from "./kanban-preview";
import { 
  BarChart3, 
  Kanban, 
  Calendar, 
  Network, 
  TrendingUp, 
  FileText,
  Sparkles,
  Clock,
  Users,
  Shield
} from "lucide-react";

interface FeatureCellProps extends FeatureCardVariants {
  className?: string;
  children: React.ReactNode;
  animationDelay?: number;
}

function FeatureCell({ 
  size, 
  interactive, 
  variant, 
  className, 
  children,
  animationDelay = 0 
}: FeatureCellProps) {
  return (
    <div 
      className={cn(
        featureCardVariants({ size, interactive, variant }),
        "animate-in fade-in-0 slide-in-from-bottom-6 duration-700",
        className
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {children}
    </div>
  );
}

// Individual feature cells with micro-interactions

export function GanttFeatureCell() {
  return (
    <FeatureCell size="lg" variant="gradient" animationDelay={0}>
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="p-2 rounded-lg bg-primary/10 w-fit mb-3">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight mb-2">Interactive Gantt Charts</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Timeline visualization with critical path analysis, 
              dependency tracking, and automatic schedule updates.
            </p>
          </div>
        </div>
        <div className="flex-1 mt-4">
          <GanttPreview />
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Auto-scheduling</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>Resource leveling</span>
          </div>
        </div>
      </div>
    </FeatureCell>
  );
}

export function KanbanFeatureCell() {
  return (
    <FeatureCell size="lg" variant="gradient" animationDelay={100}>
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="p-2 rounded-lg bg-chart-2/10 w-fit mb-3">
              <Kanban className="w-6 h-6 text-chart-2" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight mb-2">Kanban Boards</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Customizable workflows with WIP limits, 
              drag-and-drop cards, and real-time collaboration.
            </p>
          </div>
        </div>
        <div className="flex-1 mt-4">
          <KanbanPreview />
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span>WIP Limits</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>Real-time sync</span>
          </div>
        </div>
      </div>
    </FeatureCell>
  );
}

export function AIInsightsCell() {
  return (
    <FeatureCell size="md" variant="accent" animationDelay={200}>
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight mb-2">AI-Powered Insights</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Predictive analytics, automated summaries, and intelligent risk predictions using Gemini AI.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              Risk Detection
            </span>
            <span className="px-2 py-1 rounded-full bg-chart-2/10 text-chart-2 text-xs font-medium">
              Effort Estimation
            </span>
            <span className="px-2 py-1 rounded-full bg-chart-3/10 text-chart-3 text-xs font-medium">
              SOW Parsing
            </span>
          </div>
        </div>
      </div>
    </FeatureCell>
  );
}

export function PortfolioCell() {
  return (
    <FeatureCell size="md" animationDelay={300}>
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-chart-4/10 shrink-0">
          <Network className="w-6 h-6 text-chart-4" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight mb-2">Portfolio Management</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Executive dashboards, strategic alignment, and demand management for project portfolios.
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">12</p>
              <p className="text-[10px] text-muted-foreground">Projects</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">87%</p>
              <p className="text-[10px] text-muted-foreground">On Track</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">$2.4M</p>
              <p className="text-[10px] text-muted-foreground">Budget</p>
            </div>
          </div>
        </div>
      </div>
    </FeatureCell>
  );
}

export function CalendarCell() {
  return (
    <FeatureCell size="sm" animationDelay={400}>
      <div className="p-2 rounded-lg bg-chart-3/10 w-fit mb-3">
        <Calendar className="w-5 h-5 text-chart-3" />
      </div>
      <h3 className="text-base font-semibold tracking-tight mb-2">Calendar View</h3>
      <p className="text-sm text-muted-foreground">
        Multiple perspectives with powerful filtering and grouping.
      </p>
    </FeatureCell>
  );
}

export function ReportsCell() {
  return (
    <FeatureCell size="sm" animationDelay={500}>
      <div className="p-2 rounded-lg bg-chart-5/10 w-fit mb-3">
        <FileText className="w-5 h-5 text-chart-5" />
      </div>
      <h3 className="text-base font-semibold tracking-tight mb-2">Comprehensive Reports</h3>
      <p className="text-sm text-muted-foreground">
        Excel exports, burndown charts, and customizable status reports.
      </p>
    </FeatureCell>
  );
}

export function AnalyticsCell() {
  return (
    <FeatureCell size="sm" animationDelay={600}>
      <div className="p-2 rounded-lg bg-chart-1/10 w-fit mb-3">
        <TrendingUp className="w-5 h-5 text-chart-1" />
      </div>
      <h3 className="text-base font-semibold tracking-tight mb-2">Advanced Analytics</h3>
      <p className="text-sm text-muted-foreground">
        Team velocity, budget tracking, and performance metrics.
      </p>
    </FeatureCell>
  );
}

