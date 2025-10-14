import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TaskForm } from "@/components/task-form";
import { useUIStore } from "@/stores/useUIStore";
import { EmptyState } from "@/components/empty-state";
import type { Task, Project, InsertTask } from "@shared/schema";

export default function Calendar() {
  const params = useParams();
  const projectIdFromUrl = params.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Use centralized store for all state management
  const { 
    activeDialog, 
    setActiveDialog,
    selectedProjectId,
    setSelectedProjectId,
    calendarCurrentDate,
    setCalendarCurrentDate
  } = useUIStore();

  // Initialize project from URL
  useEffect(() => {
    if (projectIdFromUrl) {
      setSelectedProjectId(projectIdFromUrl);
    }
  }, [projectIdFromUrl, setSelectedProjectId]);

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${selectedProjectId}`],
    enabled: !!selectedProjectId,
  });

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: selectedProjectId ? ["/api/tasks", { projectId: selectedProjectId }] : ["/api/tasks"],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const response = await apiRequest("POST", "/api/tasks", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      if (selectedProjectId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", { projectId: selectedProjectId }] });
      }
      setActiveDialog(null);
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

  const daysInMonth = new Date(calendarCurrentDate.getFullYear(), calendarCurrentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarCurrentDate.getFullYear(), calendarCurrentDate.getMonth(), 1).getDay();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getTasksForDate = (day: number) => {
    const date = new Date(calendarCurrentDate.getFullYear(), calendarCurrentDate.getMonth(), day);
    return tasks?.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate.getDate() === day &&
             dueDate.getMonth() === calendarCurrentDate.getMonth() &&
             dueDate.getFullYear() === calendarCurrentDate.getFullYear();
    }) || [];
  };

  const previousMonth = () => {
    setCalendarCurrentDate(new Date(calendarCurrentDate.getFullYear(), calendarCurrentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCalendarCurrentDate(new Date(calendarCurrentDate.getFullYear(), calendarCurrentDate.getMonth() + 1));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="text-calendar-title">
          {project ? `${project.name} - Calendar` : 'Calendar'}
        </h1>
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
            onClick={previousMonth}
            data-testid="button-previous-month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium min-w-32 text-center">
            {monthNames[calendarCurrentDate.getMonth()]} {calendarCurrentDate.getFullYear()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={nextMonth}
            data-testid="button-next-month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCalendarCurrentDate(new Date())}
            data-testid="button-today"
          >
            Today
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      {isLoading ? (
        <Card className="p-4">
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {/* Day Headers Skeleton */}
            {dayNames.map(day => (
              <div
                key={day}
                className="bg-card p-3 text-center"
              >
                <Skeleton className="h-4 w-8 mx-auto" />
              </div>
            ))}
            {/* Calendar Days Skeleton */}
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="bg-card p-2 min-h-24 border-t">
                <Skeleton className="h-4 w-4 mb-2" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : !tasks || tasks.length === 0 ? (
        <EmptyState
          icon={CalendarIcon}
          title="No events scheduled"
          description="You don't have any tasks with due dates yet. Create tasks with due dates to see them on the calendar."
          action={{
            label: "Create Task",
            onClick: () => setActiveDialog('createTask')
          }}
        />
      ) : (
        <Card className="p-4">
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {/* Day Headers */}
            {dayNames.map(day => (
              <div
                key={day}
                className="bg-card p-3 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}

            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-card min-h-24" />
            ))}

            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayTasks = getTasksForDate(day);
              const isToday = day === new Date().getDate() &&
                              calendarCurrentDate.getMonth() === new Date().getMonth() &&
                              calendarCurrentDate.getFullYear() === new Date().getFullYear();

              return (
                <div
                  key={day}
                  className={`bg-card p-2 min-h-24 border-t ${isToday ? 'ring-2 ring-primary' : ''}`}
                  data-testid={`calendar-day-${day}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        className="text-xs p-1 rounded bg-primary/10 text-primary truncate cursor-pointer hover-elevate"
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-muted-foreground px-1">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Task Form Dialog */}
      <Dialog 
        open={activeDialog === 'createTask'} 
        onOpenChange={(isOpen) => setActiveDialog(isOpen ? 'createTask' : null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <TaskForm
            projectId={selectedProjectId || undefined}
            onSubmit={async (data) => {
              const result = await createTaskMutation.mutateAsync(data);
              return result;
            }}
            isLoading={createTaskMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
