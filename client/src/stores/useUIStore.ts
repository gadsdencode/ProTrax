// client/src/stores/useUIStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
      
      // Global search/filter
      globalSearchQuery: '',
      setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        isSidebarOpen: state.isSidebarOpen,
        ganttZoomLevel: state.ganttZoomLevel,
      }),
    }
  )
);