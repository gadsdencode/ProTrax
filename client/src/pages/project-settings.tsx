import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Save, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project, InsertProject } from "@shared/schema";
import { ProjectForm } from "@/components/project-form";
import { CustomFieldsSettings } from "@/components/custom-fields-settings";

export default function ProjectSettings() {
  const params = useParams();
  const projectId = params.id ? parseInt(params.id) : null;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");

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

  const handleProjectUpdate = (data: InsertProject) => {
    updateProjectMutation.mutate(data);
  };

  if (!projectId) {
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
          onClick={() => setLocation(`/projects/${projectId}`)}
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="general" data-testid="tab-general">
            General
          </TabsTrigger>
          <TabsTrigger value="custom-fields" data-testid="tab-custom-fields">
            Custom Fields
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">General Settings</h2>
            <ProjectForm
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
      </Tabs>
    </div>
  );
}