// client/src/stores/useUIStore.ts
import { create } from 'zustand';

interface UIState {
  selectedProjectId: number | null;
  setSelectedProjectId: (projectId: number | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedProjectId: null,
  setSelectedProjectId: (projectId) => set({ selectedProjectId: projectId }),
}));