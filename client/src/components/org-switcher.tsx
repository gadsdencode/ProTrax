/**
 * Organization Switcher Component
 * 
 * A dropdown component that allows users to:
 * - See their current organization
 * - Switch between organizations
 * - Create a new organization
 */

import { useState } from "react";
import {
  Building2,
  Check,
  ChevronsUpDown,
  Plus,
  Users,
  Crown,
  Shield,
  User,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/hooks/use-organization";
import { CreateOrganizationDialog } from "./create-organization-dialog";
import { OrganizationMembersDialog } from "./organization-members-dialog";
import { cn } from "@/lib/utils";

// Role icons and colors
const roleConfig = {
  owner: { icon: Crown, color: "text-amber-500", label: "Owner" },
  admin: { icon: Shield, color: "text-blue-500", label: "Admin" },
  member: { icon: User, color: "text-green-500", label: "Member" },
  viewer: { icon: Eye, color: "text-gray-500", label: "Viewer" },
};

interface OrgSwitcherProps {
  collapsed?: boolean;
}

export function OrgSwitcher({ collapsed = false }: OrgSwitcherProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const {
    organizations,
    currentOrganization,
    currentRole,
    isLoading,
    switchOrganizationMutation,
    canManageMembers,
  } = useOrganization();

  const handleSwitchOrg = (orgId: string) => {
    if (orgId !== currentOrganization?.id) {
      switchOrganizationMutation.mutate(orgId);
    }
  };

  const getOrgInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const RoleIcon = currentRole ? roleConfig[currentRole].icon : User;
  const roleColor = currentRole ? roleConfig[currentRole].color : "text-gray-500";

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        {!collapsed && <Skeleton className="h-4 w-24" />}
      </div>
    );
  }

  // No organizations - show create prompt
  if (organizations.length === 0) {
    return (
      <>
        <Button
          variant="outline"
          size={collapsed ? "icon" : "default"}
          className={cn(
            "w-full justify-start gap-2",
            collapsed && "justify-center"
          )}
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span>Create Organization</span>}
        </Button>
        <CreateOrganizationDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            className={cn(
              "w-full justify-start gap-2 px-2 hover:bg-accent",
              collapsed && "justify-center px-0"
            )}
            data-testid="org-switcher-trigger"
          >
            <Avatar className="h-7 w-7 rounded-md">
              <AvatarImage
                src={currentOrganization?.logoUrl || undefined}
                alt={currentOrganization?.name}
              />
              <AvatarFallback className="rounded-md bg-primary/10 text-xs font-medium">
                {currentOrganization ? getOrgInitials(currentOrganization.name) : "?"}
              </AvatarFallback>
            </Avatar>
            
            {!collapsed && (
              <>
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="text-sm font-medium truncate w-full text-left">
                    {currentOrganization?.name || "Select Organization"}
                  </span>
                  {currentRole && (
                    <span className={cn("text-xs flex items-center gap-1", roleColor)}>
                      <RoleIcon className="h-3 w-3" />
                      {roleConfig[currentRole].label}
                    </span>
                  )}
                </div>
                <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent
          className="w-64"
          align="start"
          side={collapsed ? "right" : "bottom"}
          sideOffset={collapsed ? 8 : 4}
        >
          <DropdownMenuLabel className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organizations
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Organization List */}
          <div className="max-h-64 overflow-y-auto">
            {organizations.map((membership) => {
              const org = membership.organization;
              const isActive = org.id === currentOrganization?.id;
              const MemberRoleIcon = roleConfig[membership.role].icon;
              
              return (
                <DropdownMenuItem
                  key={org.id}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer",
                    isActive && "bg-accent"
                  )}
                  onClick={() => handleSwitchOrg(org.id)}
                  data-testid={`org-option-${org.slug}`}
                >
                  <Avatar className="h-6 w-6 rounded-md">
                    <AvatarImage src={org.logoUrl || undefined} alt={org.name} />
                    <AvatarFallback className="rounded-md bg-primary/10 text-xs">
                      {getOrgInitials(org.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">{org.name}</span>
                    <span className={cn(
                      "text-xs flex items-center gap-1",
                      roleConfig[membership.role].color
                    )}>
                      <MemberRoleIcon className="h-3 w-3" />
                      {roleConfig[membership.role].label}
                    </span>
                  </div>
                  
                  {isActive && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              );
            })}
          </div>
          
          <DropdownMenuSeparator />
          
          {/* Actions */}
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setShowCreateDialog(true)}
            data-testid="create-org-button"
          >
            <Plus className="h-4 w-4" />
            <span>Create Organization</span>
          </DropdownMenuItem>
          
          {currentOrganization && canManageMembers && (
            <>
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setShowMembersDialog(true)}
                data-testid="manage-members-button"
              >
                <Users className="h-4 w-4" />
                <span>Manage Members</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrganizationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
      
      <OrganizationMembersDialog
        open={showMembersDialog}
        onOpenChange={setShowMembersDialog}
      />
    </>
  );
}

