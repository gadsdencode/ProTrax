import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Briefcase, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { useLocation } from "wouter";
import type { Project, PaginatedResult, PaginatedProjectsResult } from "@shared/schema";

export default function Portfolio() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const { data: paginatedProjects, isLoading } = useQuery<PaginatedProjectsResult>({
    queryKey: ["/api/projects/paginated", { page, limit: pageSize }],
    queryFn: async () => {
      const response = await fetch(`/api/projects/paginated?page=${page}&limit=${pageSize}`);
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
  });

  const projects = paginatedProjects?.data || [];

  // Use stats from the paginated response
  const stats = {
    total: paginatedProjects?.stats?.total || 0,
    active: paginatedProjects?.stats?.active || 0,
    onHold: paginatedProjects?.stats?.onHold || 0,
    completed: projects.filter(p => p.status === 'completed').length || 0, // Calculate from current page only as we don't have this in stats
    totalBudget: paginatedProjects?.stats?.totalBudget || 0,
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
          <div className="flex items-center justify-between">
            <CardTitle>All Projects</CardTitle>
            {projects && projects.length > 0 && (
              <Button 
                size="sm"
                onClick={() => setLocation('/projects')}
                data-testid="button-new-project"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 rounded-lg border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : !projects || projects.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={Briefcase}
                title="No projects yet"
                description="Start building your portfolio by creating your first project."
                action={{
                  label: "Create Project",
                  onClick: () => setLocation('/projects')
                }}
              />
            </div>
          ) : (
            <>
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
              
              {/* Pagination Controls */}
              {paginatedProjects && paginatedProjects.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, paginatedProjects.total)} of {paginatedProjects.total} projects
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={!paginatedProjects.hasPrevious}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">Page</span>
                      <span className="text-sm font-medium">{page}</span>
                      <span className="text-sm">of</span>
                      <span className="text-sm font-medium">{paginatedProjects.totalPages}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={!paginatedProjects.hasNext}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
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
