import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import type { Sprint } from "@shared/schema";
import { TrendingDown, TrendingUp } from "lucide-react";

interface SprintMetrics {
  sprint: Sprint;
  totalStoryPoints: number;
  completedStoryPoints: number;
  totalTasks: number;
  completedTasks: number;
  burndownData: Array<{
    date: string;
    ideal: number;
    actual: number;
  }>;
  cfdData: Array<{
    date: string;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  }>;
}

export function AgileMetrics({ projectId }: { projectId: number }) {
  const [selectedSprintId, setSelectedSprintId] = useState<string>("");

  const { data: sprints, isLoading: sprintsLoading } = useQuery<Sprint[]>({
    queryKey: ['/api/sprints', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/sprints?projectId=${projectId}`);
      if (!res.ok) throw new Error('Failed to fetch sprints');
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<SprintMetrics>({
    queryKey: ['/api/sprints', selectedSprintId, 'metrics'],
    queryFn: async () => {
      const res = await fetch(`/api/sprints/${selectedSprintId}/metrics`);
      if (!res.ok) throw new Error('Failed to fetch sprint metrics');
      return res.json();
    },
    enabled: !!selectedSprintId,
  });

  const burndownChartConfig = {
    ideal: {
      label: "Ideal",
      color: "hsl(var(--muted-foreground))",
    },
    actual: {
      label: "Actual",
      color: "hsl(var(--primary))",
    },
  };

  const cfdChartConfig = {
    done: {
      label: "Done",
      color: "hsl(var(--chart-2))",
    },
    review: {
      label: "Review",
      color: "hsl(var(--chart-3))",
    },
    inProgress: {
      label: "In Progress",
      color: "hsl(var(--chart-4))",
    },
    todo: {
      label: "To Do",
      color: "hsl(var(--chart-1))",
    },
  };

  if (sprintsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!sprints || sprints.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            No sprints found for this project. Create a sprint to see agile metrics.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Select Sprint</label>
          <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
            <SelectTrigger className="w-full max-w-md" data-testid="select-sprint">
              <SelectValue placeholder="Choose a sprint" />
            </SelectTrigger>
            <SelectContent>
              {sprints.map((sprint) => (
                <SelectItem key={sprint.id} value={sprint.id.toString()}>
                  {sprint.name} ({new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedSprintId && (
        <>
          {metricsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-96" />
              <Skeleton className="h-96" />
            </div>
          ) : metrics ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Story Points</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-story-points">
                      {metrics.totalStoryPoints}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed Points</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-2" data-testid="stat-completed-story-points">
                      {metrics.completedStoryPoints}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {metrics.totalStoryPoints > 0 
                        ? Math.round((metrics.completedStoryPoints / metrics.totalStoryPoints) * 100)
                        : 0}% complete
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-tasks">
                      {metrics.totalTasks}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-2" data-testid="stat-completed-tasks">
                      {metrics.completedTasks}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {metrics.totalTasks > 0 
                        ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100)
                        : 0}% complete
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Burndown Chart</CardTitle>
                    <CardDescription>
                      Track story points remaining over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={burndownChartConfig} className="h-80">
                      <LineChart data={metrics.burndownData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Line 
                          type="monotone" 
                          dataKey="ideal" 
                          stroke="var(--color-ideal)" 
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          dot={false}
                          name="Ideal"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="actual" 
                          stroke="var(--color-actual)" 
                          strokeWidth={2}
                          name="Actual"
                        />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cumulative Flow Diagram</CardTitle>
                    <CardDescription>
                      Visualize work distribution across sprint
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={cfdChartConfig} className="h-80">
                      <AreaChart data={metrics.cfdData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Area 
                          type="monotone" 
                          dataKey="done" 
                          stackId="1" 
                          stroke="var(--color-done)" 
                          fill="var(--color-done)"
                          name="Done"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="review" 
                          stackId="1" 
                          stroke="var(--color-review)" 
                          fill="var(--color-review)"
                          name="Review"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="inProgress" 
                          stackId="1" 
                          stroke="var(--color-inProgress)" 
                          fill="var(--color-inProgress)"
                          name="In Progress"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="todo" 
                          stackId="1" 
                          stroke="var(--color-todo)" 
                          fill="var(--color-todo)"
                          name="To Do"
                        />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
