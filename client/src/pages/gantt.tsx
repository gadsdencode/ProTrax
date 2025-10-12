import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Download, ZoomIn, ZoomOut, Plus } from "lucide-react";
import { useParams } from "wouter";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TaskForm } from "@/components/task-form";
import { GanttRow } from "@/components/gantt-row";
import type { Task, Project, InsertTask } from "@shared/schema";

export default function Gantt() {
  const params = useParams();
  const projectIdFromUrl = params.id ? parseInt(params.id) : null;
  const [zoom, setZoom] = useState(1);
  const [selectedProject, setSelectedProject] = useState<number | null>(projectIdFromUrl);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${selectedProject}`],
    enabled: !!selectedProject,
  });

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { projectId: selectedProject }],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      return await apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { projectId: selectedProject }] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setTaskDialogOpen(false);
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTaskDatesMutation = useMutation({
    mutationFn: async ({ taskId, startDate, dueDate }: { taskId: number; startDate: Date; dueDate: Date }) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}`, { 
        startDate: startDate.toISOString(), 
        dueDate: dueDate.toISOString() 
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { projectId: selectedProject }] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      // Check if there were cascaded updates
      const cascadedCount = data.cascadedUpdates?.length || 0;
      const criticalPathCount = data.criticalPath?.length || 0;
      
      let description = "Task dates updated successfully";
      if (cascadedCount > 0) {
        description += `. ${cascadedCount} dependent task${cascadedCount > 1 ? 's' : ''} automatically updated.`;
      }
      if (criticalPathCount > 0) {
        description += ` Critical path recalculated (${criticalPathCount} task${criticalPathCount > 1 ? 's' : ''}).`;
      }
      
      toast({
        title: "Schedule Updated",
        description,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    
    if (!delta.x) return;

    const task = active.data.current?.task as Task;
    if (!task || !task.startDate || !task.dueDate) return;

    // Calculate how many days the task was moved
    const daysMoved = Math.round(delta.x / dayWidth);
    
    if (daysMoved === 0) return;

    // Calculate new dates
    const oldStartDate = new Date(task.startDate);
    const oldDueDate = new Date(task.dueDate);
    
    const newStartDate = new Date(oldStartDate);
    newStartDate.setDate(oldStartDate.getDate() + daysMoved);
    
    const newDueDate = new Date(oldDueDate);
    newDueDate.setDate(oldDueDate.getDate() + daysMoved);

    // Update task dates
    updateTaskDatesMutation.mutate({
      taskId: task.id,
      startDate: newStartDate,
      dueDate: newDueDate,
    });
  };

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
            {selectedProject && (
              <Button
                onClick={() => setTaskDialogOpen(true)}
                data-testid="button-new-task"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            )}
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
            <DndContext onDragEnd={handleDragEnd}>
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
            </DndContext>
          </div>
        )}
      </div>

      {/* Task Creation Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <TaskForm
            projectId={selectedProject || undefined}
            onSubmit={(data) => createTaskMutation.mutate(data)}
            isLoading={createTaskMutation.isPending}
          />
        </DialogContent>
      </Dialog>
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
