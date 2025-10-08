import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Download, ZoomIn, ZoomOut } from "lucide-react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Task, Project } from "@shared/schema";

export default function Gantt() {
  const params = useParams();
  const projectIdFromUrl = params.id ? parseInt(params.id) : null;
  const [zoom, setZoom] = useState(1);
  const [selectedProject, setSelectedProject] = useState<number | null>(projectIdFromUrl);
  const { toast } = useToast();

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${selectedProject}`],
    enabled: !!selectedProject,
  });

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { projectId: selectedProject }],
  });

  const handleExport = async () => {
    try {
      const response = await fetch('/api/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType: 'gantt', data: tasks }),
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gantt-export.csv';
      a.click();
      
      toast({
        title: "Export successful",
        description: "Gantt chart exported to CSV",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export Gantt chart",
        variant: "destructive",
      });
    }
  };

  // Calculate date range
  const getDateRange = () => {
    if (!tasks || tasks.length === 0) return { start: new Date(), end: new Date() };
    
    const dates = tasks
      .filter(t => t.startDate && t.dueDate)
      .flatMap(t => [new Date(t.startDate!), new Date(t.dueDate!)]);
    
    if (dates.length === 0) return { start: new Date(), end: new Date() };
    
    const start = new Date(Math.min(...dates.map(d => d.getTime())));
    const end = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return { start, end };
  };

  const dateRange = getDateRange();
  const dayWidth = 40 * zoom;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-gantt-title">
              {project ? `${project.name} - Gantt Chart` : 'Gantt Chart'}
            </h1>
            {project && (
              <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              data-testid="button-zoom-out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              data-testid="button-zoom-in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!tasks || tasks.length === 0}
              data-testid="button-export-gantt"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <Card className="m-6">
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">
                No tasks to display. Create tasks to see them on the Gantt chart.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="min-w-max">
            {/* Timeline Header */}
            <div className="sticky top-0 z-10 bg-background border-b flex">
              <div className="w-80 shrink-0 border-r p-3 font-medium text-sm">
                Task Name
              </div>
              <div className="flex">
                {generateDateHeaders(dateRange.start, dateRange.end).map((date, i) => (
                  <div
                    key={i}
                    className="border-r text-center p-2 text-xs font-medium"
                    style={{ width: `${dayWidth}px` }}
                  >
                    <div>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Rows */}
            <div>
              {tasks.map(task => (
                <GanttRow
                  key={task.id}
                  task={task}
                  dateRange={dateRange}
                  dayWidth={dayWidth}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GanttRow({ task, dateRange, dayWidth }: { task: Task; dateRange: { start: Date; end: Date }; dayWidth: number }) {
  if (!task.startDate || !task.dueDate) return null;

  const taskStart = new Date(task.startDate);
  const taskEnd = new Date(task.dueDate);
  
  const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  const taskStartDays = Math.ceil((taskStart.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  const taskDuration = Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const left = Math.max(0, taskStartDays * dayWidth);
  const width = taskDuration * dayWidth;

  return (
    <div className="flex border-b h-12" data-testid={`gantt-row-${task.id}`}>
      <div className="w-80 shrink-0 border-r p-3 flex items-center gap-2">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm truncate">{task.title}</span>
      </div>
      <div className="relative flex-1" style={{ minWidth: `${totalDays * dayWidth}px` }}>
        <div
          className={`absolute top-2 h-8 rounded ${
            task.isOnCriticalPath ? 'bg-destructive' : 'bg-primary'
          } ${task.isMilestone ? 'w-0 h-0 border-l-[16px] border-r-[16px] border-b-[16px] border-l-transparent border-r-transparent' : ''}`}
          style={{
            left: `${left}px`,
            width: task.isMilestone ? 'auto' : `${width}px`,
          }}
          title={task.title}
        >
          {!task.isMilestone && task.progress && task.progress > 0 && (
            <div
              className="h-full bg-primary-foreground/30 rounded-l"
              style={{ width: `${task.progress}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function generateDateHeaders(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}
