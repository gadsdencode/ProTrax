import { cn } from "@/lib/utils";

interface GanttBar {
  label: string;
  start: number;
  width: number;
  color: string;
  delay: number;
}

const ganttBars: GanttBar[] = [
  { label: "Planning", start: 0, width: 25, color: "bg-primary", delay: 0 },
  { label: "Design", start: 20, width: 30, color: "bg-chart-2", delay: 100 },
  { label: "Development", start: 35, width: 45, color: "bg-chart-1", delay: 200 },
  { label: "Testing", start: 65, width: 25, color: "bg-chart-3", delay: 300 },
  { label: "Launch", start: 85, width: 15, color: "bg-chart-4", delay: 400 },
];

export function GanttPreview() {
  return (
    <div className="w-full h-full min-h-[200px] p-4 rounded-xl bg-background/50 border border-border/50">
      {/* Timeline header */}
      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
        <div className="w-20 shrink-0">Task</div>
        <div className="flex-1 flex justify-between px-2">
          <span>Week 1</span>
          <span>Week 2</span>
          <span>Week 3</span>
          <span>Week 4</span>
        </div>
      </div>
      
      {/* Gantt bars */}
      <div className="space-y-3">
        {ganttBars.map((bar, index) => (
          <div key={bar.label} className="flex items-center gap-2">
            <div className="w-20 shrink-0 text-xs font-medium truncate">
              {bar.label}
            </div>
            <div className="flex-1 h-6 bg-muted/30 rounded relative overflow-hidden">
              <div
                className={cn(
                  bar.color,
                  "absolute h-full rounded transition-all duration-700 ease-out",
                  "opacity-0 scale-x-0 origin-left",
                  "group-hover:opacity-100 group-hover:scale-x-100"
                )}
                style={{
                  left: `${bar.start}%`,
                  width: `${bar.width}%`,
                  transitionDelay: `${bar.delay}ms`,
                }}
              />
              {/* Static preview bar */}
              <div
                className={cn(
                  bar.color,
                  "absolute h-full rounded opacity-40",
                  "animate-in slide-in-from-left-full duration-1000"
                )}
                style={{
                  left: `${bar.start}%`,
                  width: `${bar.width}%`,
                  animationDelay: `${bar.delay + 500}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      
      {/* Critical path indicator */}
      <div className="mt-4 flex items-center gap-2 text-xs">
        <div className="w-3 h-3 rounded bg-destructive/60" />
        <span className="text-muted-foreground">Critical Path</span>
        <div className="flex-1 h-px bg-border/50" />
        <span className="text-muted-foreground font-medium">4 weeks total</span>
      </div>
    </div>
  );
}

