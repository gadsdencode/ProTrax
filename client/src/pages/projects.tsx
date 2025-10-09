import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StaggeredList, StaggeredItem } from "@/components/staggered-list";
import type { Project, InsertProject, InsertTask } from "@shared/schema";
import { ProjectForm } from "@/components/project-form";
import { TaskForm } from "@/components/task-form";

export default function Projects() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      return await apiRequest("POST", "/api/projects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Project created successfully",
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

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      return await apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      // Invalidate both global and project-scoped task queries
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      if (selectedProjectId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", { projectId: selectedProjectId }] });
      }
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

  const filteredProjects = projects?.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-projects-title">Projects</h1>
          <p className="text-muted-foreground">Manage your project portfolio</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-project">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <ProjectForm
              onSubmit={(data) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-projects"
        />
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : !filteredProjects || filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? "No projects match your search" : "No projects yet. Create your first project to get started!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <StaggeredList className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map(project => (
            <StaggeredItem key={project.id}>
              <Card
                className="hover-elevate transition-all cursor-pointer h-full"
                onClick={() => setLocation(`/projects/${project.id}/gantt`)}
                data-testid={`project-card-${project.id}`}
              >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{project.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize mt-1">
                      {project.status?.replace('_', ' ')}
                    </p>
                  </div>
                  <div
                    className="h-3 w-3 rounded-full ml-3 shrink-0"
                    style={{ backgroundColor: project.color || '#3B82F6' }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {project.description}
                  </p>
                )}
                {project.startDate && project.endDate && (
                  <div className="text-xs text-muted-foreground">
                    {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
                  </div>
                )}
                {project.budget && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Budget: ${parseFloat(project.budget).toLocaleString()}
                  </div>
                )}
                <div className="mt-4 pt-3 border-t flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProjectId(project.id);
                      setTaskDialogOpen(true);
                    }}
                    data-testid={`button-add-task-${project.id}`}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Task
                  </Button>
                </div>
              </CardContent>
            </Card>
            </StaggeredItem>
          ))}
        </StaggeredList>
      )}

      {/* Task Creation Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <TaskForm
            projectId={selectedProjectId || undefined}
            onSubmit={(data) => createTaskMutation.mutate(data)}
            isLoading={createTaskMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
