import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, MoreVertical } from "lucide-react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import type { Task, KanbanColumn } from "@shared/schema";

export default function Kanban() {
  const params = useParams();
  const projectIdFromUrl = params.id ? parseInt(params.id) : null;
  const [selectedProject, setSelectedProject] = useState<number | null>(projectIdFromUrl);
  const [activeId, setActiveId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: columns, isLoading: columnsLoading } = useQuery<KanbanColumn[]>({
    queryKey: ["/api/kanban/columns", { projectId: selectedProject }],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { projectId: selectedProject }],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      // Invalidate with the correct query key pattern
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { projectId: selectedProject }] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task moved",
        description: "Task status updated successfully",
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
    const { active, over } = event;
    setActiveId(null);
    
    if (!over || active.id === over.id) return;
    
    const taskId = active.id as number;
    const newStatus = over.id as string;
    
    updateTaskMutation.mutate({ taskId, status: newStatus });
  };

  const defaultColumns = [
    { id: 1, name: 'To Do', status: 'todo', wipLimit: null, color: '#94A3B8' },
    { id: 2, name: 'In Progress', status: 'in_progress', wipLimit: 5, color: '#3B82F6' },
    { id: 3, name: 'Review', status: 'review', wipLimit: 3, color: '#F59E0B' },
    { id: 4, name: 'Done', status: 'done', wipLimit: null, color: '#10B981' },
  ];

  const displayColumns = columns && columns.length > 0 ? columns : defaultColumns;

  const getTasksForColumn = (columnStatus: string) => {
    return tasks?.filter(t => t.status === columnStatus) || [];
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 bg-background">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold" data-testid="text-kanban-title">Kanban Board</h1>
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
              <Skeleton key={i} className="w-80 h-96" />
            ))}
          </div>
        ) : (
          <DndContext onDragEnd={handleDragEnd} onDragStart={(e) => setActiveId(e.active.id as number)}>
            <div className="flex gap-4 min-w-max">
              {displayColumns.map(column => {
                const columnTasks = getTasksForColumn(column.status || column.name.toLowerCase().replace(' ', '_'));
                const isOverLimit = column.wipLimit && columnTasks.length > column.wipLimit;

                return (
                  <KanbanColumnDroppable
                    key={column.id}
                    column={column}
                    tasks={columnTasks}
                    isOverLimit={isOverLimit}
                  />
                );
              })}
            </div>
            <DragOverlay>
              {activeId ? (
                <div className="opacity-75">
                  <TaskCard task={tasks?.find(t => t.id === activeId)!} isDragging />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function KanbanColumnDroppable({ 
  column, 
  tasks, 
  isOverLimit 
}: { 
  column: KanbanColumn; 
  tasks: Task[]; 
  isOverLimit: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.status || column.name.toLowerCase().replace(' ', '_'),
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-80 shrink-0 transition-all ${isOver ? 'ring-2 ring-primary' : ''}`}
      data-testid={`kanban-column-${column.name.toLowerCase().replace(' ', '-')}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
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
        {tasks.map(task => (
          <DraggableTaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

function DraggableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCard task={task} isDragging={isDragging} />
    </div>
  );
}

function TaskCard({ task, isDragging }: { task: Task; isDragging?: boolean }) {
  return (
    <Card 
      className={`hover-elevate transition-all ${isDragging ? '' : 'cursor-grab active:cursor-grabbing'}`} 
      data-testid={`task-card-${task.id}`}
    >
      <CardHeader className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium line-clamp-2 flex-1">{task.title}</h4>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreVertical className="h-3 w-3" />
          </Button>
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
