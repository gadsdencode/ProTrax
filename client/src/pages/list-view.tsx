import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Download, ArrowUpDown, Plus } from "lucide-react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskForm } from "@/components/task-form";
import type { Task, Project } from "@shared/schema";

export default function ListView() {
  const params = useParams();
  const projectIdFromUrl = params.id ? parseInt(params.id) : null;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [sortField, setSortField] = useState<keyof Task>("dueDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [taskFormOpen, setTaskFormOpen] = useState(false);

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${projectIdFromUrl}`],
    enabled: !!projectIdFromUrl,
  });

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", projectIdFromUrl ? { projectId: projectIdFromUrl } : {}],
  });

  const filteredAndSortedTasks = tasks
    ?.filter(task =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      const direction = sortDirection === "asc" ? 1 : -1;
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (aValue < bValue) return -direction;
      if (aValue > bValue) return direction;
      return 0;
    });

  const toggleSort = (field: keyof Task) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleTaskSelection = (taskId: number) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const toggleAllTasks = () => {
    if (selectedTasks.length === filteredAndSortedTasks?.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredAndSortedTasks?.map(t => t.id) || []);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="text-list-title">
          {project ? `${project.name} - List View` : 'List View'}
        </h1>
        <div className="flex items-center gap-2">
          {projectIdFromUrl && (
            <Button
              onClick={() => setTaskFormOpen(true)}
              data-testid="button-new-task"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          )}
          <Button variant="outline" size="sm" data-testid="button-filter">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm" data-testid="button-export-list">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-tasks"
        />
      </div>

      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <span className="text-sm font-medium">{selectedTasks.length} selected</span>
          <Button variant="outline" size="sm">
            Change Status
          </Button>
          <Button variant="outline" size="sm">
            Assign
          </Button>
          <Button variant="outline" size="sm" className="text-destructive">
            Delete
          </Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !filteredAndSortedTasks || filteredAndSortedTasks.length === 0 ? (
        <div className="border rounded-lg p-16 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? "No tasks match your search" : "No tasks to display"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedTasks.length === filteredAndSortedTasks.length}
                    onCheckedChange={toggleAllTasks}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort("title")}
                    className="h-8 p-2"
                  >
                    Task
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort("status")}
                    className="h-8 p-2"
                  >
                    Status
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort("priority")}
                    className="h-8 p-2"
                  >
                    Priority
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort("dueDate")}
                    className="h-8 p-2"
                  >
                    Due Date
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTasks.map(task => (
                <TableRow key={task.id} data-testid={`task-row-${task.id}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedTasks.includes(task.id)}
                      onCheckedChange={() => toggleTaskSelection(task.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{task.title}</div>
                      {task.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {task.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusColor(task.status!)}
                    >
                      {task.status?.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getPriorityColor(task.priority!)}
                    >
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {task.progress !== null && task.progress > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">
                          {task.progress}%
                        </span>
                      </div>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Task Form Dialog */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        projectId={projectIdFromUrl}
      />
    </div>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    todo: 'border-muted-foreground/20 text-muted-foreground',
    in_progress: 'border-primary/50 text-primary',
    review: 'border-chart-3/50 text-chart-3',
    done: 'border-chart-2/50 text-chart-2',
    blocked: 'border-destructive/50 text-destructive',
  };
  return colors[status] || '';
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
