import { ChevronRight } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@shared/schema";

interface GanttRowProps {
  task: Task;
  dateRange: { start: Date; end: Date };
  dayWidth: number;
}

export function GanttRow({ task, dateRange, dayWidth }: GanttRowProps) {
  if (!task.startDate || !task.dueDate) return null;

  const taskStart = new Date(task.startDate);
  const taskEnd = new Date(task.dueDate);
  
  const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  const taskStartDays = Math.ceil((taskStart.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  const taskDuration = Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const left = Math.max(0, taskStartDays * dayWidth);
  const width = taskDuration * dayWidth;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: {
      task,
      originalLeft: left,
    },
  });

  const style = transform
    ? {
        left: `${left + transform.x}px`,
        width: task.isMilestone ? 'auto' : `${width}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 1,
      }
    : {
        left: `${left}px`,
        width: task.isMilestone ? 'auto' : `${width}px`,
        cursor: 'grab',
      };

  return (
    <div className="flex border-b h-12" data-testid={`gantt-row-${task.id}`}>
      <div className="w-80 shrink-0 border-r p-3 flex items-center gap-2">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm truncate">{task.title}</span>
      </div>
      <div className="relative flex-1" style={{ minWidth: `${totalDays * dayWidth}px` }}>
        <div
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          className={`absolute top-2 h-8 rounded ${
            task.isOnCriticalPath ? 'bg-destructive' : 'bg-primary'
          } ${task.isMilestone ? 'w-0 h-0 border-l-[16px] border-r-[16px] border-b-[16px] border-l-transparent border-r-transparent' : ''}`}
          style={style}
          title={task.title}
          data-testid={`gantt-bar-${task.id}`}
        >
          {!task.isMilestone && (task.progress ?? 0) > 0 && (
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
