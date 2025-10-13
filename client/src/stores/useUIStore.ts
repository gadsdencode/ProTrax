// client/src/stores/useUIStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define all possible dialogs that can be opened globally
export type DialogType = 
  | 'createProject' 
  | 'createFromSOW' 
  | 'createTask' 
  | 'manageStakeholders' 
  | 'fileAttachments'
  | 'taskDetail';

interface UIState {
  // Project selection
  selectedProjectId: number | null;
  setSelectedProjectId: (projectId: number | null) => void;
  
  // Sidebar state
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // View preferences
  ganttZoomLevel: number;
  setGanttZoomLevel: (level: number) => void;
  
  // Centralized dialog state
  activeDialog: DialogType | null;
  setActiveDialog: (dialog: DialogType | null, projectId?: number) => void;
  
  // Context for dialogs that need project info
  selectedProjectForDialog: { id: number; name: string } | null;
  setSelectedProjectForDialog: (project: { id: number; name: string } | null) => void;
  
  // Task management state
  selectedTaskId: number | null;
  setSelectedTaskId: (taskId: number | null) => void;
  createTaskStatus: string;
  setCreateTaskStatus: (status: string) => void;
  
  // Global search/filter
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Project selection
      selectedProjectId: null,
      setSelectedProjectId: (projectId) => set({ selectedProjectId: projectId }),
      
      // Sidebar state
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      
      // View preferences
      ganttZoomLevel: 1,
      setGanttZoomLevel: (level) => set({ ganttZoomLevel: level }),
      
      // Centralized dialog state
      activeDialog: null,
      setActiveDialog: (dialog, projectId) => set(state => ({ 
        activeDialog: dialog, 
        // Also set the selectedProjectId if a dialog needs it
        selectedProjectId: projectId !== undefined ? projectId : state.selectedProjectId
      })),
      
      // Context for dialogs
      selectedProjectForDialog: null,
      setSelectedProjectForDialog: (project) => set({ selectedProjectForDialog: project }),
      
      // Task management state
      selectedTaskId: null,
      setSelectedTaskId: (taskId) => set({ selectedTaskId: taskId }),
      createTaskStatus: 'todo',
      setCreateTaskStatus: (status) => set({ createTaskStatus: status }),
      
      // Global search/filter
      globalSearchQuery: '',
      setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),
    }),
    {
      name: 'ui-storage',
      // Only persist non-transient state
      partialize: (state) => ({
        isSidebarOpen: state.isSidebarOpen,
        ganttZoomLevel: state.ganttZoomLevel,
      }),
    }
  )
);