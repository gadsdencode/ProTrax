import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign } from "lucide-react";
import type { Project } from "@shared/schema";

export default function Portfolio() {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const stats = {
    total: projects?.length || 0,
    active: projects?.filter(p => p.status === 'active').length || 0,
    onHold: projects?.filter(p => p.status === 'on_hold').length || 0,
    completed: projects?.filter(p => p.status === 'completed').length || 0,
    totalBudget: projects?.reduce((sum, p) => sum + (parseFloat(p.budget || '0')), 0) || 0,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold mb-2" data-testid="text-portfolio-title">
          Portfolio Dashboard
        </h1>
        <p className="text-muted-foreground">
          Executive overview of all projects
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="stat-total-projects">
                {stats.total}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-chart-2" data-testid="stat-active-projects">
                {stats.active}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Hold</CardTitle>
            <AlertTriangle className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-chart-3" data-testid="stat-on-hold-projects">
                {stats.onHold}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold" data-testid="stat-total-budget">
                ${stats.totalBudget.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : !projects || projects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No projects in portfolio
            </p>
          ) : (
            <div className="space-y-3">
              {projects.map(project => (
                <div
                  key={project.id}
                  className="p-4 rounded-lg border hover-elevate transition-all"
                  data-testid={`portfolio-project-${project.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{project.name}</h3>
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: project.color || '#3B82F6' }}
                        />
                      </div>
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={getStatusColor(project.status!)}
                    >
                      {project.status?.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {project.startDate && project.endDate && (
                      <div>
                        <div className="text-muted-foreground mb-1">Timeline</div>
                        <div className="font-medium">
                          {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    {project.budget && (
                      <div>
                        <div className="text-muted-foreground mb-1">Budget</div>
                        <div className="font-medium">
                          ${parseFloat(project.budget).toLocaleString()}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-muted-foreground mb-1">Health</div>
                      <div className="flex items-center gap-2">
                        <Progress value={75} className="h-2" />
                        <span className="text-xs text-muted-foreground">75%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    planning: 'border-muted-foreground/20 text-muted-foreground',
    active: 'border-chart-2/50 text-chart-2',
    on_hold: 'border-chart-3/50 text-chart-3',
    completed: 'border-primary/50 text-primary',
    cancelled: 'border-destructive/50 text-destructive',
  };
  return colors[status] || '';
}
