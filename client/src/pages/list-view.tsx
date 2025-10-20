import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Filter, Download, ArrowUpDown, Plus, List, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaskForm } from "@/components/task-form";
import { TaskDetail } from "@/components/task-detail";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUIStore } from "@/stores/useUIStore";
import { useProjectSync } from "@/hooks/use-project-sync";
import type { Task, Project, InsertTask, PaginatedResult } from "@shared/schema";

export default function ListView() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25); // More items per page for list view
  
  // Use single source of truth for project selection
  const { selectedProjectId, setSelectedProjectId } = useProjectSync({ updateUrl: true });
  
  // Use centralized store for other state management
  const {
    activeDialog,
    setActiveDialog,
    selectedTaskId,
    setSelectedTaskId,
    globalSearchQuery,
    setGlobalSearchQuery,
    listViewSelectedTasks,
    setListViewSelectedTasks,
    listViewSortField,
    setListViewSortField,
    listViewSortDirection,
    setListViewSortDirection,
  } = useUIStore();

  // Clear selected tasks when project changes to prevent operating on wrong tasks
  useEffect(() => {
    setListViewSelectedTasks([]);
    setPage(1); // Reset to first page when project changes
  }, [selectedProjectId, setListViewSelectedTasks]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [globalSearchQuery]);

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${selectedProjectId}`],
    enabled: !!selectedProjectId,
  });

  const queryParams: Record<string, number | string> = {};
  if (selectedProjectId) queryParams.projectId = selectedProjectId;
  if (globalSearchQuery) queryParams.searchQuery = globalSearchQuery;

  const { data: paginatedTasks, isLoading } = useQuery<PaginatedResult<Task>>({
    queryKey: ["/api/tasks/paginated", { ...queryParams, page, limit: pageSize, sortBy: listViewSortField, sortOrder: listViewSortDirection }],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (selectedProjectId) searchParams.append('projectId', selectedProjectId.toString());
      if (globalSearchQuery) searchParams.append('searchQuery', globalSearchQuery);
      searchParams.append('page', page.toString());
      searchParams.append('limit', pageSize.toString());
      searchParams.append('sortBy', listViewSortField);
      searchParams.append('sortOrder', listViewSortDirection);
      
      const response = await fetch(`/api/tasks/paginated?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
  });

  const tasks = paginatedTasks?.data || [];

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const response = await apiRequest("POST", "/api/tasks", data);
      const taskData = await response.json();
      console.log('API response for task creation:', taskData);
      return taskData as Task;
    },
    onSuccess: (createdTask) => {
      // Invalidate both legacy and paginated queries
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/paginated"] });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${createdTask.id}`] });
      setActiveDialog(null);
      toast({
        title: "Task created",
        description: "Task has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // No need for client-side sorting as we're doing server-side sorting now
  const filteredAndSortedTasks = tasks;

  const toggleSort = (field: keyof Task) => {
    if (listViewSortField === field) {
      setListViewSortDirection(listViewSortDirection === "asc" ? "desc" : "asc");
    } else {
      setListViewSortField(field);
      setListViewSortDirection("asc");
    }
    setPage(1); // Reset to first page when sorting changes
  };

  const toggleTaskSelection = (taskId: number) => {
    setListViewSelectedTasks(
      listViewSelectedTasks.includes(taskId)
        ? listViewSelectedTasks.filter(id => id !== taskId)
        : [...listViewSelectedTasks, taskId]
    );
  };

  const toggleAllTasks = () => {
    if (listViewSelectedTasks.length === filteredAndSortedTasks?.length) {
      setListViewSelectedTasks([]);
    } else {
      setListViewSelectedTasks(filteredAndSortedTasks?.map(t => t.id) || []);
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
          {selectedProjectId && (
            <Button
              onClick={() => {
                setActiveDialog('createTask');
              }}
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
          value={globalSearchQuery}
          onChange={(e) => setGlobalSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-tasks"
        />
      </div>

      {/* Bulk Actions */}
      {listViewSelectedTasks.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <span className="text-sm font-medium">{listViewSelectedTasks.length} selected</span>
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
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Skeleton className="h-4 w-4" />
                </TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map(i => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-2 w-24" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : !selectedProjectId ? (
        <EmptyState
          icon={List}
          title="No project selected"
          description="Select a project to view its tasks in a list format."
          action={{
            label: "Create Project",
            onClick: () => setLocation('/projects')
          }}
        />
      ) : !filteredAndSortedTasks || filteredAndSortedTasks.length === 0 ? (
        globalSearchQuery ? (
          <EmptyState
            icon={Search}
            title="No matching tasks"
            description={`No tasks match your search for "${globalSearchQuery}".`}
            action={{
              label: "Clear Search",
              onClick: () => setGlobalSearchQuery("")
            }}
          />
        ) : (
          <EmptyState
            icon={List}
            title="No tasks yet"
            description="Create your first task to see it in the list view."
            action={{
              label: "Create Task",
              onClick: () => {
                setActiveDialog('createTask');
              }
            }}
          />
        )
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={listViewSelectedTasks.length === filteredAndSortedTasks.length}
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
                <TableRow 
                  key={task.id} 
                  data-testid={`task-row-${task.id}`}
                  className="cursor-pointer hover-elevate"
                  onClick={(e) => {
                    console.log('Row clicked, task id:', task.id);
                    // Only open task detail if not clicking on checkbox
                    const target = e.target as HTMLElement;
                    const isCheckbox = target.closest('input[type="checkbox"]') || target.closest('[data-testid*="checkbox"]');
                    console.log('Is checkbox click:', !!isCheckbox);
                    if (!isCheckbox) {
                      console.log('Setting selected task id to:', task.id);
                      setSelectedTaskId(task.id);
                      setActiveDialog('taskDetail');
                    }
                  }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={listViewSelectedTasks.includes(task.id)}
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
          
          {/* Pagination Controls */}
          {paginatedTasks && paginatedTasks.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, paginatedTasks.total)} of {paginatedTasks.total} tasks
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={!paginatedTasks.hasPrevious}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  <span className="text-sm">Page</span>
                  <span className="text-sm font-medium">{page}</span>
                  <span className="text-sm">of</span>
                  <span className="text-sm font-medium">{paginatedTasks.totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!paginatedTasks.hasNext}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
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
              try {
                const result = await createTaskMutation.mutateAsync(data);
                console.log('CreateTaskMutation result:', result);
                return result;
              } catch (error) {
                console.error('Error in onSubmit:', error);
                throw error;
              }
            }}
            isLoading={createTaskMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Task Detail Sheet */}
      <TaskDetail
        task={filteredAndSortedTasks?.find(t => t.id === selectedTaskId) || null}
        open={activeDialog === 'taskDetail'}
        onOpenChange={(open) => {
          setActiveDialog(open ? 'taskDetail' : null);
          if (!open) setSelectedTaskId(null);
        }}
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
