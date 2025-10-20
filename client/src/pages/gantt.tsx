import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Download, ZoomIn, ZoomOut, Plus, AlertCircle, Calendar, BarChart } from "lucide-react";
import { useLocation } from "wouter";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useUIStore } from "@/stores/useUIStore";
import { EmptyState } from "@/components/empty-state";
import { useProjectSync } from "@/hooks/use-project-sync";
import type { Task, Project, InsertTask } from "@shared/schema";

export default function Gantt() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Use single source of truth for project selection
  const { selectedProjectId } = useProjectSync({ updateUrl: true });
  
  // Use centralized store for other state management
  const { 
    activeDialog, 
    setActiveDialog,
    ganttZoomLevel,
    setGanttZoomLevel,
    selectedTaskId,
    setSelectedTaskId
  } = useUIStore();

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${selectedProjectId}`],
    enabled: !!selectedProjectId,
  });

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: selectedProjectId ? ["/api/tasks", { projectId: selectedProjectId }] : ["/api/tasks"],
  });

  // Derive editing task from selectedTaskId
  const editingTask = tasks?.find(t => t.id === selectedTaskId) || null;

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const response = await apiRequest("POST", "/api/tasks", data);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate all task queries to ensure UI updates
      if (selectedProjectId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", { projectId: selectedProjectId }] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setActiveDialog(null);
      setSelectedTaskId(null);
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

  const updateTaskMutation = useMutation({
    mutationFn: async (data: InsertTask & { id: number }) => {
      const { id, ...updateData } = data;
      const response = await apiRequest("PATCH", `/api/tasks/${id}`, updateData);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate all task queries to ensure UI updates
      if (selectedProjectId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", { projectId: selectedProjectId }] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      // Also invalidate the specific task query
      if (selectedTaskId) {
        queryClient.invalidateQueries({ queryKey: [`/api/tasks/${selectedTaskId}`] });
      }
      setActiveDialog(null);
      setSelectedTaskId(null);
      toast({
        title: "Success",
        description: "Task dates updated successfully",
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
      // Invalidate all task queries to ensure UI updates
      if (selectedProjectId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", { projectId: selectedProjectId }] });
      }
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
  const dayWidth = 40 * ganttZoomLevel;
  
  // Separate tasks into scheduled and unscheduled
  const scheduledTasks = tasks?.filter(t => t.startDate && t.dueDate) || [];
  const unscheduledTasks = tasks?.filter(t => !t.startDate || !t.dueDate) || [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-gantt-title">
              {project ? `${project.name} - Gantt Chart` : 'Gantt Chart'}
            </h1>
            <div className="flex items-center gap-4 mt-1">
              {project && (
                <p className="text-sm text-muted-foreground">{project.description}</p>
              )}
              {tasks && tasks.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    {scheduledTasks.length} Scheduled
                  </Badge>
                  {unscheduledTasks.length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {unscheduledTasks.length} Unscheduled
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedProjectId && (
              <Button
                onClick={() => setActiveDialog('createTask')}
                data-testid="button-new-task"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGanttZoomLevel(Math.max(0.5, ganttZoomLevel - 0.25))}
              data-testid="button-zoom-out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGanttZoomLevel(Math.min(2, ganttZoomLevel + 0.25))}
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
          <div className="p-6">
            <div className="sticky top-0 z-10 bg-background border-b flex">
              <div className="w-80 shrink-0 border-r p-3">
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <div key={i} className="border-r p-2" style={{ width: '40px' }}>
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2 mt-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex">
                  <div className="w-80 shrink-0 border-r p-3">
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <div className="flex-1 p-2">
                    <Skeleton className="h-8 w-64" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !selectedProjectId ? (
          <div className="p-6">
            <EmptyState
              icon={BarChart}
              title="No project selected"
              description="Select a project to view its Gantt chart or create a new project."
              action={{
                label: "Create Project",
                onClick: () => setLocation('/projects')
              }}
            />
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Calendar}
              title="No tasks to display"
              description="Create tasks with start and due dates to see them on the Gantt chart."
              action={{
                label: "Create Task",
                onClick: () => setActiveDialog('createTask')
              }}
            />
          </div>
        ) : scheduledTasks.length === 0 ? (
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  No Scheduled Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  {unscheduledTasks.length} task{unscheduledTasks.length !== 1 ? 's' : ''} need dates to appear on the Gantt chart.
                  Tasks created from SOW uploads often don't have dates assigned.
                </p>
                {unscheduledTasks.length > 0 && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    <div className="text-sm font-medium mb-2">Unscheduled Tasks:</div>
                    {unscheduledTasks.slice(0, 20).map(task => (
                      <div key={task.id} className="flex items-center justify-between p-2 border rounded-lg hover-elevate">
                        <span className="text-sm">{task.title}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTaskId(task.id);
                            setActiveDialog('createTask');
                          }}
                          data-testid={`button-schedule-task-${task.id}`}
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          Add Dates
                        </Button>
                      </div>
                    ))}
                    {unscheduledTasks.length > 20 && (
                      <p className="text-sm text-muted-foreground text-center mt-2">
                        And {unscheduledTasks.length - 20} more...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
                {scheduledTasks.map(task => (
                  <GanttRow
                    key={task.id}
                    task={task}
                    dateRange={dateRange}
                    dayWidth={dayWidth}
                  />
                ))}
              </div>
            </DndContext>
            
            {/* Unscheduled Tasks Section */}
            {unscheduledTasks.length > 0 && (
              <div className="mt-8 mx-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      Unscheduled Tasks ({unscheduledTasks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">
                      These tasks need start and due dates to appear in the timeline above.
                    </p>
                    <div className="grid gap-2 max-h-48 overflow-y-auto">
                      {unscheduledTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-2 border rounded text-sm hover-elevate">
                          <span className="truncate flex-1 mr-2">{task.title}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() => {
                              setSelectedTaskId(task.id);
                              setActiveDialog('createTask');
                            }}
                            data-testid={`button-schedule-${task.id}`}
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            Schedule
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Creation/Edit Dialog */}
      <Dialog 
        open={activeDialog === 'createTask'} 
        onOpenChange={(open) => {
          setActiveDialog(open ? 'createTask' : null);
          if (!open) setSelectedTaskId(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Update Task Dates' : 'Create New Task'}</DialogTitle>
          </DialogHeader>
          <TaskForm
            projectId={editingTask?.projectId || selectedProjectId || undefined}
            defaultValues={editingTask ? {
              title: editingTask.title,
              description: editingTask.description || undefined,
              status: editingTask.status || undefined,
              priority: editingTask.priority || undefined,
              projectId: editingTask.projectId || undefined,
              assigneeId: editingTask.assigneeId || undefined,
              startDate: editingTask.startDate || undefined,
              dueDate: editingTask.dueDate || undefined,
              estimatedHours: editingTask.estimatedHours || undefined,
            } : undefined}
            onSubmit={async (data) => {
              if (editingTask) {
                const result = await updateTaskMutation.mutateAsync({ ...data, id: editingTask.id });
                return result;
              } else {
                const result = await createTaskMutation.mutateAsync(data);
                return result;
              }
            }}
            isLoading={editingTask ? updateTaskMutation.isPending : createTaskMutation.isPending}
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
