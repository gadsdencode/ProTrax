import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Save, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUIStore } from "@/stores/useUIStore";
import { useProjectSync } from "@/hooks/use-project-sync";
import type { Project, InsertProject } from "@shared/schema";
import { ProjectForm } from "@/components/project-form";
import { CustomFieldsSettings } from "@/components/custom-fields-settings";

export default function ProjectSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Use single source of truth for project selection
  const { selectedProjectId: projectId, isValidProjectId } = useProjectSync({ 
    updateUrl: true,
    onInvalidRedirect: '/projects' 
  });
  
  // Use centralized store for tab state
  const { projectSettingsActiveTab, setProjectSettingsActiveTab } = useUIStore();

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (data: Partial<InsertProject>) => {
      return await apiRequest("PATCH", `/api/projects/${projectId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project updated",
        description: "Project settings have been saved successfully",
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

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/projects/${projectId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Project deleted",
        description: "The project has been deleted successfully",
      });
      // Invalidate and redirect
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setLocation("/projects");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProjectUpdate = (data: InsertProject) => {
    updateProjectMutation.mutate(data);
  };

  if (!projectId || !isValidProjectId) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Invalid project ID</p>
          <Button
            onClick={() => setLocation("/projects")}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Project not found</p>
          <Button
            onClick={() => setLocation("/projects")}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8" data-testid="project-settings-page">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation(`/projects/${projectId}/gantt`)}
          className="mb-4"
          data-testid="button-back-to-project"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </Button>
        
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <SettingsIcon className="h-8 w-8" />
          {project.name} - Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage project configuration and custom fields
        </p>
      </div>

      <Tabs value={projectSettingsActiveTab} onValueChange={setProjectSettingsActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="general" data-testid="tab-general">
            General
          </TabsTrigger>
          <TabsTrigger value="custom-fields" data-testid="tab-custom-fields">
            Custom Fields
          </TabsTrigger>
          <TabsTrigger value="danger-zone" data-testid="tab-danger-zone">
            Danger Zone
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">General Settings</h2>
            <ProjectForm
              mode="edit"
              onSubmit={handleProjectUpdate}
              isLoading={updateProjectMutation.isPending}
              defaultValues={{
                name: project.name,
                description: project.description || "",
                charter: project.charter || "",
                status: project.status,
                startDate: project.startDate || undefined,
                endDate: project.endDate || undefined,
                budget: project.budget || undefined,
                color: project.color || "#3B82F6",
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="custom-fields" className="space-y-4">
          <div className="max-w-4xl">
            <h2 className="text-xl font-semibold mb-4">Custom Fields Management</h2>
            <p className="text-muted-foreground mb-6">
              Custom fields allow you to capture additional information specific to your project's needs.
              These fields will appear in all tasks within this project.
            </p>
            <CustomFieldsSettings projectId={projectId} />
          </div>
        </TabsContent>

        <TabsContent value="danger-zone" className="space-y-4">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold mb-4 text-destructive">Danger Zone</h2>
            
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Delete Project
                </CardTitle>
                <CardDescription>
                  Once you delete a project, there is no going back. This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>All project settings and configurations</li>
                    <li>All tasks, subtasks, and their attachments</li>
                    <li>All sprints and sprint data</li>
                    <li>All custom fields and their values</li>
                    <li>All comments and activity history</li>
                    <li>All time entries and expense records</li>
                    <li>All automation rules</li>
                    <li>All project-related data</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      data-testid="button-delete-project"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete This Project
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-3">
                        <p>
                          This action cannot be undone. This will permanently delete the project
                          <span className="font-semibold"> {project.name} </span>
                          and all of its associated data.
                        </p>
                        <p className="text-destructive font-semibold">
                          Type the project name to confirm: {project.name}
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={() => deleteProjectMutation.mutate()}
                        disabled={deleteProjectMutation.isPending}
                        data-testid="button-confirm-delete"
                      >
                        {deleteProjectMutation.isPending ? "Deleting..." : "Delete Project"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}