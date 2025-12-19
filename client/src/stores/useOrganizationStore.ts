/**
 * Organization Store
 * 
 * Manages organization state for multi-tenancy:
 * - Current organization context
 * - User's organizations list (cached)
 * - Organization switching
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  plan: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembership {
  organization: Organization;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  isDefault: boolean;
  joinedAt: string | null;
}

interface OrganizationState {
  // Current organization context
  currentOrganization: Organization | null;
  currentRole: OrganizationMembership['role'] | null;
  
  // Actions
  setCurrentOrganization: (org: Organization | null, role?: OrganizationMembership['role'] | null) => void;
  clearOrganization: () => void;
  
  // Helper to check if organization context is set
  hasOrganization: () => boolean;
  
  // Permission helpers
  isOwner: () => boolean;
  isAdmin: () => boolean;
  canManageMembers: () => boolean;
  canEditOrganization: () => boolean;
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set, get) => ({
      // State
      currentOrganization: null,
      currentRole: null,
      
      // Actions
      setCurrentOrganization: (org, role = null) => set({ 
        currentOrganization: org,
        currentRole: role,
      }),
      
      clearOrganization: () => set({ 
        currentOrganization: null,
        currentRole: null,
      }),
      
      // Helpers
      hasOrganization: () => get().currentOrganization !== null,
      
      isOwner: () => get().currentRole === 'owner',
      
      isAdmin: () => {
        const role = get().currentRole;
        return role === 'owner' || role === 'admin';
      },
      
      canManageMembers: () => {
        const role = get().currentRole;
        return role === 'owner' || role === 'admin';
      },
      
      canEditOrganization: () => {
        const role = get().currentRole;
        return role === 'owner' || role === 'admin';
      },
    }),
    {
      name: 'organization-storage',
      // Persist organization context across page reloads
      partialize: (state) => ({
        currentOrganization: state.currentOrganization,
        currentRole: state.currentRole,
      }),
    }
  )
);

