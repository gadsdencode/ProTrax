import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, BarChart3, PieChart, TrendingUp, Loader2, Mail, FolderKanban, Brain, ChartBar } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Project } from "@shared/schema";
import { EmailReportDialog } from "@/components/email-report-dialog";
import { AgileMetrics } from "@/components/agile-metrics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

interface PredictionResult {
  prediction: string;
  confidence: number;
  riskFactors: string[];
}

export default function Reports() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [summary, setSummary] = useState<string>("");
  const [predictions, setPredictions] = useState<PredictionResult | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [exportingReport, setExportingReport] = useState<string | null>(null);

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const summaryMutation = useMutation({
    mutationFn: async () => {
      const projectId = projects?.[0]?.id;
      if (!projectId) {
        throw new Error("No projects found");
      }
      const res = await apiRequest("POST", "/api/ai/generate-summary", { projectId });
      return res.json();
    },
    onSuccess: (data: any) => {
      setSummary(data.summary || "Summary generated successfully");
      toast({
        title: "Summary Generated",
        description: "AI summary has been generated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate summary",
        variant: "destructive",
      });
    },
  });

  const predictionsMutation = useMutation({
    mutationFn: async () => {
      const projectId = projects?.[0]?.id;
      if (!projectId) {
        throw new Error("No projects found");
      }
      const res = await apiRequest("POST", "/api/ai/predict-deadline", { projectId });
      return res.json();
    },
    onSuccess: (data: PredictionResult) => {
      setPredictions(data);
      toast({
        title: "Predictions Generated",
        description: "AI predictions have been generated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate predictions",
        variant: "destructive",
      });
    },
  });

  const handleExport = async (reportType: string) => {
    try {
      setExportingReport(reportType);
      
      const projectId = projects?.[0]?.id;
      if (!projectId) {
        toast({
          title: "No project selected",
          description: "Please select a project to export",
          variant: "destructive",
        });
        return;
      }

      // Fetch tasks data for the project
      const tasksResponse = await fetch(`/api/tasks?projectId=${projectId}`);
      if (!tasksResponse.ok) throw new Error("Failed to fetch tasks");
      const tasks = await tasksResponse.json();

      // Determine the export type based on report title
      let exportType = 'gantt';
      let exportData = tasks;
      
      if (reportType.toLowerCase().includes('gantt')) {
        exportType = 'gantt';
      } else if (reportType.toLowerCase().includes('kanban')) {
        exportType = 'kanban';
      } else {
        // For now, other reports will default to Gantt format
        exportType = 'gantt';
      }

      // Send export request
      const response = await fetch('/api/export/excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: exportType,
          data: exportData,
        }),
      });

      if (!response.ok) throw new Error("Export failed");

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportType}-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `${reportType} has been downloaded`,
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export report",
        variant: "destructive",
      });
    } finally {
      setExportingReport(null);
    }
  };

  const reports = [
    {
      title: "Gantt Chart Export",
      description: "Export project timeline with dependencies and critical path",
      icon: BarChart3,
      format: "Excel (.xlsx)",
    },
    {
      title: "Kanban Board Export",
      description: "Export task list with status, priority, and assignments",
      icon: FileText,
      format: "Excel (.xlsx)",
    },
    {
      title: "Financial Report",
      description: "Budget vs actual with cost categories and forecasts",
      icon: PieChart,
      format: "Excel (.xlsx)",
    },
    {
      title: "Burndown Chart",
      description: "Sprint progress with velocity and remaining work",
      icon: TrendingUp,
      format: "Excel (.xlsx)",
    },
    {
      title: "Risk Register",
      description: "Complete risk assessment with mitigation plans",
      icon: FileText,
      format: "Excel (.xlsx)",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-reports-title">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            View agile metrics, generate reports, and export data
          </p>
        </div>
        <Button
          onClick={() => setEmailDialogOpen(true)}
          data-testid="button-email-report"
          className="gap-2"
        >
          <Mail className="h-4 w-4" />
          Email Report
        </Button>
      </div>

      <Tabs defaultValue="metrics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="metrics" data-testid="tab-agile-metrics">Agile Metrics</TabsTrigger>
          <TabsTrigger value="exports" data-testid="tab-exports">Exports</TabsTrigger>
          <TabsTrigger value="ai" data-testid="tab-ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-6">
          {projectsLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-8 w-12" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <Skeleton className="h-80" />
                  <Skeleton className="h-80" />
                </div>
              </CardContent>
            </Card>
          ) : projects && projects.length > 0 ? (
            <AgileMetrics projectId={projects[0].id} />
          ) : (
            <EmptyState
              icon={ChartBar}
              title="No projects found"
              description="Create a project with sprints to view agile metrics and track team progress."
              action={{
                label: "Create Project",
                onClick: () => setLocation('/projects')
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="exports" className="space-y-6">

          <div className="grid gap-4 md:grid-cols-2">
            {reports.map((report, index) => (
              <Card key={index} className="hover-elevate transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <report.icon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{report.title}</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {report.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{report.format}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`button-export-${report.title.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => handleExport(report.title)}
                      disabled={exportingReport === report.title}
                    >
                      {exportingReport === report.title ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          {projectsLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-full mb-3" />
                  <Skeleton className="h-9 w-36" />
                </div>
                <div className="p-4 rounded-lg border">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-full mb-3" />
                  <Skeleton className="h-9 w-36" />
                </div>
              </CardContent>
            </Card>
          ) : !projects || projects.length === 0 ? (
            <EmptyState
              icon={Brain}
              title="No projects for AI analysis"
              description="Create a project with tasks to unlock AI-powered predictions and summaries."
              action={{
                label: "Create Project",
                onClick: () => setLocation('/projects')
              }}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>AI-Powered Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
          <div className="p-4 rounded-lg border bg-primary/5">
            <h3 className="font-semibold mb-2">Predictive Analytics</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Use AI to predict project completion dates and identify potential delays
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              data-testid="button-generate-predictions"
              onClick={() => predictionsMutation.mutate()}
              disabled={predictionsMutation.isPending || !projects?.length}
            >
              {predictionsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Predictions
            </Button>
            {predictions && (
              <div className="mt-3 p-3 rounded-md bg-background border" data-testid="ai-predictions-output">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Prediction:</span>
                    <span className={`text-sm px-2 py-0.5 rounded-md ${
                      predictions.prediction === 'on-time' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                      predictions.prediction === 'at-risk' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                    }`} data-testid="text-prediction-type">
                      {predictions.prediction}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Confidence:</span>
                    <span className="text-sm" data-testid="text-prediction-confidence">
                      {(predictions.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  {predictions.riskFactors && predictions.riskFactors.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">Risk Factors:</span>
                      <ul className="mt-1 space-y-1" data-testid="list-risk-factors">
                        {predictions.riskFactors.map((factor, index) => (
                          <li key={index} className="text-sm text-muted-foreground ml-4 list-disc">
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg border bg-primary/5">
            <h3 className="font-semibold mb-2">Automated Summaries</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Generate executive summaries of project status and team activity
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              data-testid="button-generate-summary"
              onClick={() => summaryMutation.mutate()}
              disabled={summaryMutation.isPending || !projects?.length}
            >
              {summaryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Summary
            </Button>
            {summary && (
              <div className="mt-3 p-3 rounded-md bg-background border" data-testid="ai-summary-output">
                <p className="text-sm">{summary}</p>
              </div>
            )}
          </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <EmailReportDialog 
        open={emailDialogOpen} 
        onOpenChange={setEmailDialogOpen}
        projectId={projects?.[0]?.id}
      />
    </div>
  );
}
