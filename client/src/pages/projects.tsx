import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Search, Users, Paperclip, Settings, FileText } from "lucide-react";
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
import { apiRequest, queryClient, handleMutationError } from "@/lib/queryClient";
import { StaggeredList, StaggeredItem } from "@/components/staggered-list";
import type { Project, InsertProject, InsertTask } from "@shared/schema";
import { ProjectForm } from "@/components/project-form";
import { TaskForm } from "@/components/task-form";
import { StakeholderDialog } from "@/components/stakeholder-dialog";
import { FileAttachmentDialog } from "@/components/file-attachment-dialog";
import { SOWFileUpload } from "@/components/sow-file-upload";
import { useUIStore } from "@/stores/useUIStore";

export default function Projects() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Use centralized store for all UI state
  const { 
    activeDialog, 
    setActiveDialog, 
    globalSearchQuery, 
    setGlobalSearchQuery,
    selectedProjectId,
    setSelectedProjectId,
    selectedProjectForDialog,
    setSelectedProjectForDialog
  } = useUIStore();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: globalSearchQuery 
      ? ["/api/projects", { searchQuery: globalSearchQuery }] 
      : ["/api/projects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      return await apiRequest("POST", "/api/projects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/paginated"] });
      setActiveDialog(null);
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    // Use the standard error handler for consistent error display
    onError: handleMutationError,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      return await apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      // Invalidate all task queries including those with search params
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/paginated"] });
      setActiveDialog(null);
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    },
    // Use the standard error handler for consistent error display
    onError: handleMutationError,
  });

  const filteredProjects = projects;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-projects-title">Projects</h1>
          <p className="text-muted-foreground">Manage your project portfolio</p>
        </div>
        <div className="flex gap-2">
          <Dialog 
            open={activeDialog === 'createProject'} 
            onOpenChange={(isOpen) => setActiveDialog(isOpen ? 'createProject' : null)}
          >
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
          <Dialog 
            open={activeDialog === 'createFromSOW'} 
            onOpenChange={(isOpen) => setActiveDialog(isOpen ? 'createFromSOW' : null)}
          >
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-create-from-sow">
                <FileText className="h-4 w-4 mr-2" />
                Create from SOW
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Project from SOW</DialogTitle>
              </DialogHeader>
              <SOWFileUpload
                onUploadComplete={(project) => {
                  queryClient.invalidateQueries({ queryKey: ["/api/projects"], refetchType: 'all' });
                  setActiveDialog(null);
                  toast({
                    title: "Success",
                    description: `Project "${project.name}" has been created from your SOW`,
                  });
                  // Navigate to the new project
                  setLocation(`/projects/${project.id}/gantt`);
                }}
                onUploadError={(error) => {
                  toast({
                    title: "Error",
                    description: error,
                    variant: "destructive",
                  });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={globalSearchQuery}
          onChange={(e) => setGlobalSearchQuery(e.target.value)}
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
              {globalSearchQuery ? "No projects match your search" : "No projects yet. Create your first project to get started!"}
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
                <div className="mt-4 pt-3 border-t flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDialog('createTask', project.id);
                    }}
                    data-testid={`button-add-task-${project.id}`}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Task
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProjectForDialog({ id: project.id, name: project.name });
                      setActiveDialog('manageStakeholders');
                    }}
                    data-testid={`button-manage-stakeholders-${project.id}`}
                  >
                    <Users className="h-3 w-3 mr-1" />
                    Stakeholders
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProjectForDialog({ id: project.id, name: project.name });
                      setActiveDialog('fileAttachments');
                    }}
                    data-testid={`button-manage-files-${project.id}`}
                  >
                    <Paperclip className="h-3 w-3 mr-1" />
                    Files
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/projects/${project.id}/settings`);
                    }}
                    data-testid={`button-settings-${project.id}`}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
            </StaggeredItem>
          ))}
        </StaggeredList>
      )}

      {/* Task Creation Dialog */}
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
            onSubmit={(data) => createTaskMutation.mutate(data)}
            isLoading={createTaskMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Stakeholder Management Dialog */}
      {selectedProjectForDialog && (
        <StakeholderDialog
          projectId={selectedProjectForDialog.id}
          projectName={selectedProjectForDialog.name}
          open={activeDialog === 'manageStakeholders'}
          onOpenChange={(isOpen) => setActiveDialog(isOpen ? 'manageStakeholders' : null)}
        />
      )}

      {/* File Attachment Management Dialog */}
      {selectedProjectForDialog && (
        <FileAttachmentDialog
          projectId={selectedProjectForDialog.id}
          projectName={selectedProjectForDialog.name}
          open={activeDialog === 'fileAttachments'}
          onOpenChange={(isOpen) => setActiveDialog(isOpen ? 'fileAttachments' : null)}
        />
      )}
    </div>
  );
}