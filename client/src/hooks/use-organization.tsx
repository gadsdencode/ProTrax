/**
 * Organization Hook
 * 
 * Provides organization-related API operations and state management:
 * - Fetch user's organizations
 * - Switch organization
 * - Create organization
 * - Manage organization settings
 */

import { createContext, ReactNode, useContext, useEffect, useRef } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { apiRequest, queryClient, handleMutationError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  useOrganizationStore, 
  Organization, 
  OrganizationMembership 
} from "@/stores/useOrganizationStore";

// Types for API responses
interface OrganizationWithRole extends Organization {
  role: OrganizationMembership['role'];
}

interface CreateOrganizationData {
  name: string;
  slug: string;
  description?: string;
}

interface InviteMemberData {
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

interface OrganizationContextType {
  // State
  organizations: OrganizationMembership[];
  currentOrganization: Organization | null;
  currentRole: OrganizationMembership['role'] | null;
  isLoading: boolean;
  error: Error | null;
  
  // Mutations
  switchOrganizationMutation: UseMutationResult<OrganizationWithRole, Error, string>;
  createOrganizationMutation: UseMutationResult<OrganizationWithRole, Error, CreateOrganizationData>;
  inviteMemberMutation: UseMutationResult<void, Error, InviteMemberData>;
  
  // Helpers
  hasOrganization: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  canManageMembers: boolean;
  
  // Actions
  refreshOrganizations: () => void;
}

export const OrganizationContext = createContext<OrganizationContextType | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Get store state directly to avoid unnecessary re-renders
  const currentOrganization = useOrganizationStore((state) => state.currentOrganization);
  const currentRole = useOrganizationStore((state) => state.currentRole);
  const setCurrentOrganization = useOrganizationStore((state) => state.setCurrentOrganization);
  const clearOrganization = useOrganizationStore((state) => state.clearOrganization);

  // Track if we've initialized to prevent infinite loops
  const initializedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Fetch user's organizations
  const {
    data: organizations = [],
    error,
    isLoading,
    refetch: refreshOrganizations,
  } = useQuery<OrganizationMembership[], Error>({
    queryKey: ["/api/organizations"],
    enabled: !!user, // Only fetch when user is logged in
  });

  // Handle user logout - clear organization
  useEffect(() => {
    if (!user && lastUserIdRef.current !== null) {
      // User just logged out
      clearOrganization();
      initializedRef.current = false;
      lastUserIdRef.current = null;
    } else if (user) {
      lastUserIdRef.current = user.id;
    }
  }, [user, clearOrganization]);

  // Auto-set organization on first load when organizations are fetched
  useEffect(() => {
    // Skip if no user, still loading, or already initialized with orgs
    if (!user || isLoading) {
      return;
    }

    // Only auto-initialize if we don't have a current organization set
    if (organizations.length > 0 && !currentOrganization && !initializedRef.current) {
      initializedRef.current = true;
      
      // Find default organization or use first one
      const defaultOrg = organizations.find(m => m.isDefault) || organizations[0];
      if (defaultOrg) {
        setCurrentOrganization(defaultOrg.organization, defaultOrg.role);
      }
    }
    
    // If organizations were fetched but empty, mark as initialized
    if (!isLoading && organizations.length === 0) {
      initializedRef.current = true;
    }
  }, [organizations, isLoading, user, currentOrganization, setCurrentOrganization]);

  // Switch organization mutation
  const switchOrganizationMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const res = await apiRequest("POST", `/api/organizations/${organizationId}/switch`);
      return await res.json();
    },
    onSuccess: (data: OrganizationWithRole) => {
      setCurrentOrganization(data, data.role);
      
      // Invalidate all queries to refresh data with new org context
      queryClient.invalidateQueries();
      
      toast({
        title: "Organization switched",
        description: `Now working in ${data.name}`,
      });
    },
    onError: handleMutationError,
  });

  // Create organization mutation
  const createOrganizationMutation = useMutation({
    mutationFn: async (data: CreateOrganizationData) => {
      const res = await apiRequest("POST", "/api/organizations", data);
      return await res.json();
    },
    onSuccess: (data: OrganizationWithRole) => {
      // Add to organizations list
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      
      // Switch to new organization
      setCurrentOrganization(data, data.role);
      queryClient.invalidateQueries();
      
      toast({
        title: "Organization created",
        description: `${data.name} is ready to use`,
      });
    },
    onError: handleMutationError,
  });

  // Invite member mutation
  const inviteMemberMutation = useMutation({
    mutationFn: async (data: InviteMemberData) => {
      if (!currentOrganization) throw new Error("No organization selected");
      
      const res = await apiRequest(
        "POST", 
        `/api/organizations/${currentOrganization.id}/invitations`,
        data
      );
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "The user will receive an email invitation",
      });
    },
    onError: handleMutationError,
  });

  // Compute permission values directly to avoid function call issues
  const hasOrgValue = currentOrganization !== null;
  const isOwnerValue = currentRole === 'owner';
  const isAdminValue = currentRole === 'owner' || currentRole === 'admin';
  const canManageMembersValue = currentRole === 'owner' || currentRole === 'admin';

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrganization,
        currentRole,
        isLoading,
        error,
        switchOrganizationMutation,
        createOrganizationMutation,
        inviteMemberMutation,
        hasOrganization: hasOrgValue,
        isOwner: isOwnerValue,
        isAdmin: isAdminValue,
        canManageMembers: canManageMembersValue,
        refreshOrganizations: () => refreshOrganizations(),
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}

/**
 * Hook to get the current organization ID for API headers.
 * Returns undefined if no organization is selected.
 */
export function useOrganizationId(): string | undefined {
  const { currentOrganization } = useOrganizationStore();
  return currentOrganization?.id;
}

