// client/src/hooks/use-project-sync.ts
import { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useUIStore } from '@/stores/useUIStore';

interface UseProjectSyncOptions {
  // Whether to update URL when store changes (for deep linking)
  updateUrl?: boolean;
  // Redirect path when project ID is invalid
  onInvalidRedirect?: string;
  // Whether to auto-select first project if none selected
  autoSelectFirst?: boolean;
}

export function useProjectSync(options: UseProjectSyncOptions = {}) {
  const { 
    updateUrl = true,
    onInvalidRedirect = '/projects',
    autoSelectFirst = false
  } = options;

  const params = useParams();
  const [location, setLocation] = useLocation();
  const projectIdFromUrl = params.id ? parseInt(params.id) : null;
  
  const { 
    selectedProjectId,
    setSelectedProjectId,
    syncProjectFromUrl,
    syncProjectToUrl,
    getLastSyncTimestamp
  } = useUIStore();

  // Sync from URL to store on mount or URL change
  useEffect(() => {
    // Avoid race conditions by checking timestamp
    const lastSync = getLastSyncTimestamp();
    const now = Date.now();
    
    // If we recently synced (within 100ms), skip to avoid loops
    if (lastSync && now - lastSync < 100) {
      return;
    }

    // If URL has a project ID, sync it to the store
    if (projectIdFromUrl !== null) {
      if (projectIdFromUrl !== selectedProjectId) {
        syncProjectFromUrl(projectIdFromUrl);
      }
    } else if (autoSelectFirst) {
      // If no project in URL and autoSelectFirst is enabled,
      // this will be handled by the component (e.g., kanban.tsx)
      // which has access to the projects list
    } else if (selectedProjectId !== null && !params.id) {
      // If store has a project but URL doesn't, optionally sync
      if (updateUrl) {
        // Update URL to match store (for consistency)
        const currentPath = location.split('/').pop();
        if (currentPath && ['gantt', 'calendar', 'kanban', 'list'].includes(currentPath)) {
          setLocation(`/projects/${selectedProjectId}/${currentPath}`);
        }
      }
    }
  }, [projectIdFromUrl, selectedProjectId, location, params.id]);

  // Sync from store to URL when store changes (optional)
  useEffect(() => {
    if (!updateUrl || !selectedProjectId) return;

    // Check if we're on a project-specific route
    const pathSegments = location.split('/');
    const isProjectRoute = pathSegments[1] === 'projects' && pathSegments[2];
    const currentView = pathSegments[3]; // gantt, calendar, kanban, list, settings
    
    // Also handle non-project routes like /gantt, /calendar, etc.
    const isViewRoute = ['gantt', 'calendar', 'kanban', 'list'].includes(pathSegments[1]);
    
    if (isProjectRoute) {
      const urlProjectId = parseInt(pathSegments[2]);
      if (urlProjectId !== selectedProjectId && currentView) {
        // Update URL to match store
        syncProjectToUrl();
        setLocation(`/projects/${selectedProjectId}/${currentView}`);
      }
    } else if (isViewRoute) {
      // Convert from /gantt to /projects/:id/gantt
      const view = pathSegments[1];
      syncProjectToUrl();
      setLocation(`/projects/${selectedProjectId}/${view}`);
    }
  }, [selectedProjectId, updateUrl, location]);

  // Handle invalid project ID
  useEffect(() => {
    if (projectIdFromUrl !== null && isNaN(projectIdFromUrl)) {
      // Invalid project ID in URL
      setSelectedProjectId(null);
      if (onInvalidRedirect) {
        setLocation(onInvalidRedirect);
      }
    }
  }, [projectIdFromUrl, onInvalidRedirect]);

  return {
    selectedProjectId,
    setSelectedProjectId,
    projectIdFromUrl,
    isValidProjectId: projectIdFromUrl === null || !isNaN(projectIdFromUrl)
  };
}