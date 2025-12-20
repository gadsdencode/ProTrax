/**
 * Custom hook for AI Analysis queries and mutations
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, handleMutationError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ComprehensiveAnalysisResult, TaskEstimate, EstimateSelection } from "../types";

interface UseAIAnalysisOptions {
  projectId: number;
}

export function useAIAnalysis({ projectId }: UseAIAnalysisOptions) {
  const { toast } = useToast();
  const [selectedEstimates, setSelectedEstimates] = useState<Map<number, EstimateSelection>>(new Map());

  // Comprehensive analysis query
  const { 
    data: analysis, 
    isLoading, 
    error, 
    refetch, 
    isFetching 
  } = useQuery<ComprehensiveAnalysisResult>({
    queryKey: ['/api/ai/comprehensive-analysis', projectId],
    queryFn: async () => {
      const res = await fetch('/api/ai/comprehensive-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
        credentials: 'include',
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to run AI analysis');
      }
      return res.json();
    },
    enabled: false, // Don't auto-run, let user trigger it
    staleTime: 5 * 60 * 1000, // Consider stale after 5 minutes
  });

  // Apply estimates mutation
  const applyEstimatesMutation = useMutation({
    mutationFn: async (estimates: Array<{ taskId: number; storyPoints?: number; estimatedHours?: number }>) => {
      return await apiRequest('POST', '/api/ai/apply-estimates', { estimates });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/paginated'] });
      toast({
        title: "Estimates Applied",
        description: data.message || `Successfully updated ${data.updated} task(s)`,
      });
      setSelectedEstimates(new Map());
    },
    onError: handleMutationError,
  });

  // Selection helpers
  const toggleEstimateSelection = (taskId: number, estimate: TaskEstimate) => {
    const newSelected = new Map(selectedEstimates);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.set(taskId, {
        storyPoints: estimate.suggestedStoryPoints ?? undefined,
        hours: estimate.suggestedHours ?? undefined,
      });
    }
    setSelectedEstimates(newSelected);
  };

  const selectAllEstimates = () => {
    if (!analysis?.effortEstimation?.taskEstimates) return;
    
    const newSelected = new Map<number, EstimateSelection>();
    analysis.effortEstimation.taskEstimates.forEach(est => {
      newSelected.set(est.taskId, {
        storyPoints: est.suggestedStoryPoints ?? undefined,
        hours: est.suggestedHours ?? undefined,
      });
    });
    setSelectedEstimates(newSelected);
  };

  const clearAllEstimates = () => {
    setSelectedEstimates(new Map());
  };

  const applySelectedEstimates = () => {
    const estimates = Array.from(selectedEstimates.entries()).map(([taskId, values]) => ({
      taskId,
      storyPoints: values.storyPoints,
      estimatedHours: values.hours,
    }));
    applyEstimatesMutation.mutate(estimates);
  };

  return {
    // Query state
    analysis,
    isLoading,
    isFetching,
    error,
    refetch,
    
    // Estimate selection state
    selectedEstimates,
    toggleEstimateSelection,
    selectAllEstimates,
    clearAllEstimates,
    applySelectedEstimates,
    
    // Mutation state
    isApplyingEstimates: applyEstimatesMutation.isPending,
  };
}

