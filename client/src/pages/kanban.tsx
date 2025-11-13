import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, MoreVertical, GripVertical, Columns3, FolderKanban } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import { TaskForm } from "@/components/task-form";
import { TaskDetail } from "@/components/task-detail";
import { useUIStore } from "@/stores/useUIStore";
import { EmptyState } from "@/components/empty-state";
import { useProjectSync } from "@/hooks/use-project-sync";
import type { Task, KanbanColumn, InsertTask, Project } from "@shared/schema";

export default function Kanban() {
  const [activeId, setActiveId] = useState<number | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Use single source of truth for project selection
  const { selectedProjectId, setSelectedProjectId } = useProjectSync({ 
    updateUrl: true,
    autoSelectFirst: true 
  });
  
  // Use centralized store for other state management
  const { 
    activeDialog, 
    setActiveDialog, 
    createTaskStatus, 
    setCreateTaskStatus,
    selectedTaskId,
    setSelectedTaskId
  } = useUIStore();

  // Fetch all projects for auto-selection
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Auto-select first project if none selected
  useEffect(() => {
    if (!selectedProjectId && projects && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [selectedProjectId, projects, setSelectedProjectId]);

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${selectedProjectId}`],
    enabled: !!selectedProjectId,
  });

  const { data: columns, isLoading: columnsLoading } = useQuery<KanbanColumn[]>({
    queryKey: ["/api/kanban/columns", { projectId: selectedProjectId }],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { projectId: selectedProjectId }],
  });

  // Derive selected task from store's selectedTaskId
  const selectedTask = tasks?.find(t => t.id === selectedTaskId) || null;

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const response = await apiRequest("POST", "/api/tasks", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { projectId: selectedProjectId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      // Also invalidate custom field values queries
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/"] }); 
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

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}`, { status });
    },
    // Optimistic update
    onMutate: async ({ taskId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/tasks", { projectId: selectedProjectId }] });
      
      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(["/api/tasks", { projectId: selectedProjectId }]);
      
      // Optimistically update to the new value
      if (previousTasks) {
        const updatedTasks = previousTasks.map(task =>
          task.id === taskId ? { ...task, status } : task
        );
        queryClient.setQueryData(["/api/tasks", { projectId: selectedProjectId }], updatedTasks);
      }
      
      // Return a context object with the snapshotted value
      return { previousTasks };
    },
    onSuccess: () => {
      toast({
        title: "Task moved",
        description: "Task status updated successfully",
      });
    },
    onError: (error: Error, _variables, context) => {
      // Rollback to the previous value on error
      if (context?.previousTasks) {
        queryClient.setQueryData(["/api/tasks", { projectId: selectedProjectId }], context.previousTasks);
      }
      
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { projectId: selectedProjectId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over || active.id === over.id) return;
    
    const taskId = active.id as number;
    const newStatus = over.id as string;
    
    updateTaskMutation.mutate({ taskId, status: newStatus });
  };

  const defaultColumns: Array<{ id: number; name: string; taskStatus: string; wipLimit: number | null; color: string }> = [
    { id: 1, name: 'To Do', taskStatus: 'todo', wipLimit: null, color: '#94A3B8' },
    { id: 2, name: 'In Progress', taskStatus: 'in_progress', wipLimit: 5, color: '#3B82F6' },
    { id: 3, name: 'Review', taskStatus: 'review', wipLimit: 3, color: '#F59E0B' },
    { id: 4, name: 'Done', taskStatus: 'done', wipLimit: null, color: '#10B981' },
  ];

  // Map columns to include taskStatus (for default columns, use taskStatus; for DB columns, derive from name)
  const displayColumns = (columns && columns.length > 0 
    ? columns.map(col => ({ ...col, taskStatus: col.name.toLowerCase().replace(' ', '_') }))
    : defaultColumns
  );

  const getTasksForColumn = (columnStatus: string) => {
    return tasks?.filter(t => t.status === columnStatus) || [];
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 bg-background">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold" data-testid="text-kanban-title">
            {project ? `${project.name} - Kanban Board` : 'Kanban Board'}
          </h1>
          <Button variant="outline" size="sm" data-testid="button-configure-kanban">
            Configure Columns
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        {columnsLoading || tasksLoading ? (
          <div className="flex gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-80 shrink-0">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-8 rounded-full" />
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map(j => (
                    <Card key={j}>
                      <CardHeader className="p-4">
                        <Skeleton className="h-4 w-full" />
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-2">
                        <Skeleton className="h-3 w-3/4" />
                        <div className="flex justify-between">
                          <Skeleton className="h-5 w-16 rounded-full" />
                          <Skeleton className="h-6 w-6 rounded-full" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !selectedProjectId ? (
          <EmptyState
            icon={FolderKanban}
            title="No project selected"
            description="Select a project to view its Kanban board or create a new project."
            action={{
              label: "Create Project",
              onClick: () => setLocation('/projects')
            }}
          />
        ) : !tasks || tasks.length === 0 ? (
          <EmptyState
            icon={Columns3}
            title="No tasks yet"
            description="Create your first task to start organizing work on the Kanban board."
            action={{
              label: "Create Task",
              onClick: () => {
                setCreateTaskStatus('todo');
                setActiveDialog('createTask');
              }
            }}
          />
        ) : (
          <DndContext onDragEnd={handleDragEnd} onDragStart={(e) => setActiveId(e.active.id as number)}>
            <div className="flex gap-4 min-w-max">
              {displayColumns.map(column => {
                const columnTasks = getTasksForColumn(column.taskStatus);
                const isOverLimit = !!column.wipLimit && columnTasks.length > column.wipLimit;

                return (
                  <KanbanColumnDroppable
                    key={column.id}
                    column={column}
                    tasks={columnTasks}
                    isOverLimit={isOverLimit}
                    activeId={activeId}
                    onAddTask={(status) => {
                      setCreateTaskStatus(status);
                      setActiveDialog('createTask');
                    }}
                    onTaskClick={(task) => {
                      setSelectedTaskId(task.id);
                      setActiveDialog('taskDetail');
                    }}
                  />
                );
              })}
            </div>
            <DragOverlay>
              {activeId ? (
                <div className="rotate-3 scale-105 opacity-90 pointer-events-none">
                  <TaskCard task={tasks?.find(t => t.id === activeId)!} isDragging />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog 
        open={activeDialog === 'createTask'} 
        onOpenChange={(isOpen) => setActiveDialog(isOpen ? 'createTask' : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <TaskForm
            onSubmit={async (data) => {
              const result = await createTaskMutation.mutateAsync(data);
              return result;
            }}
            isLoading={createTaskMutation.isPending}
            projectId={selectedProjectId || undefined}
            presetStatus={createTaskStatus}
          />
        </DialogContent>
      </Dialog>

      {/* Task Detail Sheet */}
      <TaskDetail
        task={selectedTask}
        open={activeDialog === 'taskDetail'}
        onOpenChange={(open) => {
          setActiveDialog(open ? 'taskDetail' : null);
          if (!open) {
            setSelectedTaskId(null);
          }
        }}
      />
    </div>
  );
}

function KanbanColumnDroppable({ 
  column, 
  tasks, 
  isOverLimit,
  onAddTask,
  onTaskClick,
  activeId
}: { 
  column: any; 
  tasks: Task[]; 
  isOverLimit: boolean;
  onAddTask: (status: string) => void;
  onTaskClick: (task: Task) => void;
  activeId?: number | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.taskStatus || column.name.toLowerCase().replace(' ', '_'),
  });

  // Enhanced visual feedback for drag over
  const isDragging = !!activeId;
  const isActiveColumn = tasks.some(task => task.id === activeId);

  return (
    <div
      ref={setNodeRef}
      className={`
        w-80 shrink-0 transition-all duration-200 ease-in-out
        ${isOver ? 'ring-2 ring-primary scale-[1.02]' : ''}
        ${isDragging && !isActiveColumn ? 'opacity-100' : ''}
        ${isDragging && isActiveColumn ? 'opacity-75' : ''}
      `}
      data-testid={`kanban-column-${column.name.toLowerCase().replace(' ', '-')}`}
    >
      {/* Column background with enhanced hover state */}
      <div 
        className={`
          rounded-lg p-4 transition-all duration-200
          ${isOver ? 'bg-primary/5 shadow-lg' : 'bg-transparent'}
        `}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full transition-all duration-200 ${
                isOver ? 'scale-125' : ''
              }`}
              style={{ backgroundColor: column.color || '#94A3B8' }}
            />
            <h3 className="font-semibold">{column.name}</h3>
            <Badge variant="secondary" className="ml-2">
              {tasks.length}
              {column.wipLimit && `/${column.wipLimit}`}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddTask(column.taskStatus || column.name.toLowerCase().replace(' ', '_'))}
            data-testid={`button-add-task-${column.name.toLowerCase().replace(' ', '-')}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {isOverLimit && (
          <div className="mb-2 p-2 bg-destructive/10 text-destructive text-xs rounded border border-destructive/20">
            WIP limit exceeded
          </div>
        )}

        <div className="space-y-3">
          {/* Show placeholder when dragging over empty column */}
          {isOver && tasks.length === 0 && (
            <div className="border-2 border-dashed border-primary/30 rounded-lg h-32 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Drop task here</span>
            </div>
          )}
          
          {tasks.map(task => (
            <DraggableTaskCard 
              key={task.id} 
              task={task} 
              onTaskClick={onTaskClick}
            />
          ))}
          
          {/* Show drop indicator between cards when dragging */}
          {isOver && tasks.length > 0 && (
            <div className="border-2 border-dashed border-primary/30 rounded-lg h-2 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

function DraggableTaskCard({ task, onTaskClick }: { task: Task; onTaskClick: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.3 : 1,
        transition: isDragging ? 'opacity 200ms' : undefined,
        cursor: isDragging ? 'grabbing' : 'grab',
      }
    : { 
        transition: 'all 200ms ease',
        cursor: 'grab' 
      };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'z-50' : ''}>
      <TaskCard 
        task={task} 
        isDragging={isDragging} 
        onClick={() => onTaskClick(task)}
        dragListeners={listeners}
        dragAttributes={attributes}
      />
    </div>
  );
}

function TaskCard({ task, isDragging, onClick, dragListeners, dragAttributes }: { task: Task; isDragging?: boolean; onClick?: () => void; dragListeners?: any; dragAttributes?: any }) {
  return (
    <Card 
      className={`hover-elevate transition-all ${isDragging ? 'rotate-2 shadow-xl' : ''}`}
      data-testid={`task-card-${task.id}`}
    >
      <CardHeader className="p-4">
        <div className="flex items-start gap-2">
          <div 
            className="cursor-grab hover:bg-muted/50 rounded p-0.5 transition-colors" 
            {...dragListeners} 
            {...dragAttributes}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 cursor-pointer" onClick={onClick}>
            <h4 className="text-sm font-medium line-clamp-2">{task.title}</h4>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {task.priority && (
              <Badge
                variant="outline"
                className={`text-xs ${getPriorityColor(task.priority)}`}
              >
                {task.priority}
              </Badge>
            )}
          </div>
          
          {task.assigneeId && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {task.assigneeId.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {task.dueDate && (
          <div className="text-xs text-muted-foreground">
            Due {new Date(task.dueDate).toLocaleDateString()}
          </div>
        )}

        {task.progress !== null && task.progress > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">{task.progress}%</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'border-muted-foreground/20 text-muted-foreground',
    medium: 'border-primary/50 text-primary',
    high: 'border-chart-3/50 text-chart-3',
    urgent: 'border-destructive/50 text-destructive',
  };
  return colors[priority] || '';
}
