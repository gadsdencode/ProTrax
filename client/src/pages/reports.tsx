import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, BarChart3, PieChart, TrendingUp, Loader2, Mail } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Project } from "@shared/schema";
import { EmailReportDialog } from "@/components/email-report-dialog";
import { AgileMetrics } from "@/components/agile-metrics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Reports() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<string>("");
  const [predictions, setPredictions] = useState<string>("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const { data: projects } = useQuery<Project[]>({
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
    onSuccess: (data: any) => {
      setPredictions(data.prediction || data.message || "Predictions generated successfully");
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
          {projects && projects.length > 0 ? (
            <AgileMetrics projectId={projects[0].id} />
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center">
                  No projects found. Create a project to view agile metrics.
                </p>
              </CardContent>
            </Card>
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
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
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
                <p className="text-sm">{predictions}</p>
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
