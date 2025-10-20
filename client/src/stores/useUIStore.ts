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

export type Theme = "dark" | "light" | "system";

interface UIState {
  // Project selection
  selectedProjectId: number | null;
  setSelectedProjectId: (projectId: number | null) => void;
  syncProjectFromUrl: (projectId: number) => void;
  syncProjectToUrl: () => void;
  getLastSyncTimestamp: () => number | null;
  lastProjectSyncTimestamp: number | null;
  
  // Sidebar state
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Theme state
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  // View preferences
  ganttZoomLevel: number;
  setGanttZoomLevel: (level: number) => void;
  
  // ListView state
  listViewSelectedTasks: number[];
  setListViewSelectedTasks: (tasks: number[]) => void;
  listViewSortField: string;
  setListViewSortField: (field: string) => void;
  listViewSortDirection: "asc" | "desc";
  setListViewSortDirection: (direction: "asc" | "desc") => void;
  
  // Calendar state
  calendarCurrentDate: Date;
  setCalendarCurrentDate: (date: Date) => void;
  
  // Project Settings state
  projectSettingsActiveTab: string;
  setProjectSettingsActiveTab: (tab: string) => void;
  
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
    (set, get) => ({
      // Project selection
      selectedProjectId: null,
      lastProjectSyncTimestamp: null,
      setSelectedProjectId: (projectId) => set({ selectedProjectId: projectId }),
      syncProjectFromUrl: (projectId) => set({ 
        selectedProjectId: projectId,
        lastProjectSyncTimestamp: Date.now()
      }),
      syncProjectToUrl: () => set({ 
        lastProjectSyncTimestamp: Date.now()
      }),
      getLastSyncTimestamp: () => get().lastProjectSyncTimestamp,
      
      // Sidebar state
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      
      // Theme state
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      
      // View preferences
      ganttZoomLevel: 1,
      setGanttZoomLevel: (level) => set({ ganttZoomLevel: level }),
      
      // ListView state
      listViewSelectedTasks: [],
      setListViewSelectedTasks: (tasks) => set({ listViewSelectedTasks: tasks }),
      listViewSortField: 'dueDate',
      setListViewSortField: (field) => set({ listViewSortField: field }),
      listViewSortDirection: 'asc',
      setListViewSortDirection: (direction) => set({ listViewSortDirection: direction }),
      
      // Calendar state
      calendarCurrentDate: new Date(),
      setCalendarCurrentDate: (date) => set({ calendarCurrentDate: date }),
      
      // Project Settings state
      projectSettingsActiveTab: 'general',
      setProjectSettingsActiveTab: (tab) => set({ projectSettingsActiveTab: tab }),
      
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
        theme: state.theme,
        listViewSortField: state.listViewSortField,
        listViewSortDirection: state.listViewSortDirection,
        projectSettingsActiveTab: state.projectSettingsActiveTab,
      }),
    }
  )
);