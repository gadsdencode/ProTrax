import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  FolderKanban, 
  BarChart3, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp
} from "lucide-react";

const mockStats = [
  { label: "Active Projects", value: "12", icon: FolderKanban, color: "text-primary" },
  { label: "Due This Week", value: "8", icon: Clock, color: "text-chart-3" },
  { label: "Overdue", value: "2", icon: AlertCircle, color: "text-destructive" },
  { label: "Completed", value: "47", icon: CheckCircle2, color: "text-chart-2" },
];

const mockTasks = [
  { title: "API Integration Sprint", project: "Backend Overhaul", status: "in_progress", priority: "high" },
  { title: "Dashboard Redesign", project: "UX Improvements", status: "review", priority: "medium" },
  { title: "Security Audit", project: "Compliance Q4", status: "todo", priority: "urgent" },
];

export function DashboardMockup() {
  return (
    <div className={cn(
      "relative w-full max-w-4xl mx-auto",
      "rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm",
      "shadow-2xl shadow-primary/5",
      "overflow-hidden",
      "animate-in fade-in-0 slide-in-from-bottom-8 duration-1000"
    )}>
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive/60" />
          <div className="w-3 h-3 rounded-full bg-chart-3/60" />
          <div className="w-3 h-3 rounded-full bg-chart-2/60" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="px-3 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground">
            app.projecthub.com/dashboard
          </div>
        </div>
      </div>

      {/* Mock dashboard content */}
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <LayoutDashboard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Welcome back, Alex!</h3>
              <p className="text-xs text-muted-foreground">Here's your project overview</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-chart-2" />
            <span className="text-xs font-medium text-chart-2">+12% this week</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {mockStats.map((stat, index) => (
            <div
              key={stat.label}
              className={cn(
                "p-3 rounded-lg bg-muted/30 border border-border/30",
                "animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
              )}
              style={{ animationDelay: `${index * 100 + 200}ms` }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
              </div>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Task list preview */}
        <div className="rounded-lg border border-border/30 overflow-hidden">
          <div className="px-3 py-2 bg-muted/30 border-b border-border/30 flex items-center justify-between">
            <span className="text-xs font-medium">Recent Tasks</span>
            <span className="text-xs text-muted-foreground">View all →</span>
          </div>
          <div className="divide-y divide-border/30">
            {mockTasks.map((task, index) => (
              <div
                key={task.title}
                className={cn(
                  "px-3 py-2.5 flex items-center justify-between gap-3",
                  "hover:bg-muted/20 transition-colors",
                  "animate-in fade-in-0 slide-in-from-left-4 duration-500"
                )}
                style={{ animationDelay: `${index * 100 + 600}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{task.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{task.project}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                    task.status === "in_progress" && "bg-primary/20 text-primary",
                    task.status === "review" && "bg-chart-3/20 text-chart-3",
                    task.status === "todo" && "bg-muted text-muted-foreground"
                  )}>
                    {task.status.replace("_", " ")}
                  </span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                    task.priority === "high" && "bg-chart-3/20 text-chart-3",
                    task.priority === "medium" && "bg-primary/20 text-primary",
                    task.priority === "urgent" && "bg-destructive/20 text-destructive"
                  )}>
                    {task.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

