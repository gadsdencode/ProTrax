import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertCircle, CheckCircle2, Clock, FolderKanban, Mail, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { EmailReportDialog } from "@/components/email-report-dialog";
import type { Project, Task } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>("summary");
  
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: myTasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/my-tasks"],
  });

  const handleEmailReport = (reportType: string) => {
    setSelectedReportType(reportType);
    setEmailDialogOpen(true);
  };

  const stats = [
    {
      title: "Active Projects",
      value: projects?.filter(p => p.status === 'active').length || 0,
      icon: FolderKanban,
      color: "text-primary",
    },
    {
      title: "Tasks Due This Week",
      value: myTasks?.filter(t => {
        if (!t.dueDate) return false;
        const dueDate = new Date(t.dueDate);
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return dueDate >= now && dueDate <= weekFromNow;
      }).length || 0,
      icon: Clock,
      color: "text-chart-3",
    },
    {
      title: "Overdue Tasks",
      value: myTasks?.filter(t => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < new Date() && t.status !== 'done';
      }).length || 0,
      icon: AlertCircle,
      color: "text-destructive",
    },
    {
      title: "Completed This Week",
      value: myTasks?.filter(t => {
        if (!t.updatedAt) return false;
        const updated = new Date(t.updatedAt);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return updated >= weekAgo && t.status === 'done';
      }).length || 0,
      icon: CheckCircle2,
      color: "text-chart-2",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-dashboard-title">
            Welcome back, {user?.firstName || 'there'}!
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your projects and tasks
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2" data-testid="button-email-updates">
              <Mail className="h-4 w-4" />
              Email Updates
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleEmailReport("summary")} data-testid="menu-email-summary">
              Project Summary
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEmailReport("status")} data-testid="menu-email-status">
              Status Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEmailReport("gantt")} data-testid="menu-email-gantt">
              Gantt Chart Data
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEmailReport("kanban")} data-testid="menu-email-kanban">
              Kanban Board Data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {projectsLoading || tasksLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {stat.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* My Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !myTasks || myTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No tasks assigned to you yet
            </p>
          ) : (
            <div className="space-y-2">
              {myTasks.slice(0, 5).map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover-elevate transition-all"
                  data-testid={`task-${task.id}`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.dueDate && (
                      <p className="text-xs text-muted-foreground">
                        Due {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status!)}`}>
                      {task.status}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority!)}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Active Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projectsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : !projects || projects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No active projects
            </p>
          ) : (
            <div className="space-y-3">
              {projects.filter(p => p.status === 'active').slice(0, 3).map(project => (
                <div
                  key={project.id}
                  className="p-4 rounded-lg border hover-elevate transition-all"
                  data-testid={`project-${project.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold mb-1">{project.name}</h3>
                      {project.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div
                      className="h-3 w-3 rounded-full ml-3 mt-1"
                      style={{ backgroundColor: project.color || '#3B82F6' }}
                    />
                  </div>
                  {project.startDate && project.endDate && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EmailReportDialog 
        open={emailDialogOpen} 
        onOpenChange={setEmailDialogOpen}
        projectId={projects?.find(p => p.status === 'active')?.id}
        initialReportType={selectedReportType}
      />
    </div>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    todo: 'bg-muted text-muted-foreground',
    in_progress: 'bg-primary/10 text-primary',
    review: 'bg-chart-3/10 text-chart-3',
    done: 'bg-chart-2/10 text-chart-2',
    blocked: 'bg-destructive/10 text-destructive',
  };
  return colors[status] || 'bg-muted text-muted-foreground';
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-primary/10 text-primary',
    high: 'bg-chart-3/10 text-chart-3',
    urgent: 'bg-destructive/10 text-destructive',
  };
  return colors[priority] || 'bg-muted text-muted-foreground';
}
