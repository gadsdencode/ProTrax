/**
 * useJobPolling Hook - Poll for async job status updates
 * 
 * Provides a hook for polling job status from the API, with automatic
 * stop when job completes or fails. Includes progress tracking.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface JobStatusResponse {
  id: string;
  type: string;
  status: JobStatus;
  progress: number;
  progressMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: any;
  error?: string;
}

interface UseJobPollingOptions {
  /** Polling interval in ms (default: 2000) */
  interval?: number;
  /** Whether to start polling immediately (default: false) */
  autoStart?: boolean;
  /** Callback when job completes successfully */
  onComplete?: (result: any) => void;
  /** Callback when job fails */
  onError?: (error: string) => void;
  /** Callback on each status update */
  onProgress?: (status: JobStatusResponse) => void;
}

interface UseJobPollingReturn {
  /** Current job status */
  status: JobStatusResponse | null;
  /** Whether polling is active */
  isPolling: boolean;
  /** Any error from the polling request itself */
  pollError: string | null;
  /** Start polling for a job */
  startPolling: (jobId: string) => void;
  /** Stop polling */
  stopPolling: () => void;
  /** Reset state */
  reset: () => void;
}

export function useJobPolling(options: UseJobPollingOptions = {}): UseJobPollingReturn {
  const {
    interval = 2000,
    autoStart = false,
    onComplete,
    onError,
    onProgress,
  } = options;

  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const fetchJobStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/jobs/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Job not found');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch job status');
      }

      const data: JobStatusResponse = await response.json();
      
      if (!mountedRef.current) return;

      setStatus(data);
      onProgress?.(data);

      // Check if job is finished
      if (data.status === 'completed') {
        setIsPolling(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onComplete?.(data.result);
      } else if (data.status === 'failed') {
        setIsPolling(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onError?.(data.error || 'Job failed');
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      
      setPollError(err.message);
      setIsPolling(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      onError?.(err.message);
    }
  }, [onComplete, onError, onProgress]);

  const startPolling = useCallback((id: string) => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setJobId(id);
    setIsPolling(true);
    setPollError(null);
    setStatus(null);

    // Fetch immediately
    fetchJobStatus(id);

    // Then poll at interval
    intervalRef.current = setInterval(() => {
      fetchJobStatus(id);
    }, interval);
  }, [fetchJobStatus, interval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setJobId(null);
    setStatus(null);
    setPollError(null);
  }, [stopPolling]);

  // Auto-start if enabled and jobId is set
  useEffect(() => {
    if (autoStart && jobId && !isPolling) {
      startPolling(jobId);
    }
  }, [autoStart, jobId, isPolling, startPolling]);

  return {
    status,
    isPolling,
    pollError,
    startPolling,
    stopPolling,
    reset,
  };
}

