import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, BarChart3, PieChart, TrendingUp } from "lucide-react";

export default function Reports() {
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
      <div>
        <h1 className="text-2xl font-semibold mb-2" data-testid="text-reports-title">Reports & Exports</h1>
        <p className="text-muted-foreground">
          Generate comprehensive reports and export data to Excel
        </p>
      </div>

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

      {/* AI-Powered Reports */}
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
            <Button variant="outline" size="sm" data-testid="button-generate-predictions">
              Generate Predictions
            </Button>
          </div>

          <div className="p-4 rounded-lg border bg-primary/5">
            <h3 className="font-semibold mb-2">Automated Summaries</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Generate executive summaries of project status and team activity
            </p>
            <Button variant="outline" size="sm" data-testid="button-generate-summary">
              Generate Summary
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
