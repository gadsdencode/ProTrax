/**
 * Role Management Dialog
 * 
 * Admin-only component for managing user roles.
 * Provides UI to view and change user roles with appropriate safeguards.
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, ShieldAlert, User as UserIcon, Eye } from "lucide-react";
import type { User } from "@shared/schema";

// Role definitions with metadata
export const ROLE_CONFIG = {
  admin: {
    label: "Admin",
    description: "Full system access. Can manage users, roles, and all data.",
    icon: ShieldAlert,
    color: "bg-red-500/10 text-red-600 border-red-200",
  },
  project_manager: {
    label: "Project Manager",
    description: "Can create and manage projects, sprints, and team assignments.",
    icon: Shield,
    color: "bg-blue-500/10 text-blue-600 border-blue-200",
  },
  member: {
    label: "Member",
    description: "Can view and work on assigned tasks. Standard team access.",
    icon: UserIcon,
    color: "bg-green-500/10 text-green-600 border-green-200",
  },
  viewer: {
    label: "Viewer",
    description: "Read-only access. Cannot create or modify data.",
    icon: Eye,
    color: "bg-gray-500/10 text-gray-600 border-gray-200",
  },
} as const;

export type UserRole = keyof typeof ROLE_CONFIG;

interface RoleManagementDialogProps {
  user: Omit<User, 'password'> | null;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoleManagementDialog({
  user,
  currentUserId,
  open,
  onOpenChange,
}: RoleManagementDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set initial role when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && user) {
      setSelectedRole((user.role || 'member') as UserRole);
    }
    onOpenChange(newOpen);
  };

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update role");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Role updated",
        description: `User role has been changed to ${ROLE_CONFIG[variables.role].label}.`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  const currentRole = (user.role || 'member') as UserRole;
  const isSelf = user.id === currentUserId;
  const hasChanges = selectedRole !== currentRole;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage User Role</DialogTitle>
          <DialogDescription>
            Change the access level for this user. This affects what actions they can perform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback>
                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {user.firstName} {user.lastName}
                {isSelf && <span className="text-muted-foreground ml-1">(you)</span>}
              </p>
              <p className="text-sm text-muted-foreground truncate">{user.email || user.username}</p>
            </div>
            <Badge variant="outline" className={ROLE_CONFIG[currentRole].color}>
              {ROLE_CONFIG[currentRole].label}
            </Badge>
          </div>

          {/* Role selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">New Role</label>
            <Select
              value={selectedRole || currentRole}
              onValueChange={(value) => setSelectedRole(value as UserRole)}
              disabled={updateRoleMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_CONFIG).map(([role, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Role description */}
          {selectedRole && (
            <div className="p-3 rounded-lg bg-muted/30 border text-sm">
              <p className="text-muted-foreground">
                {ROLE_CONFIG[selectedRole].description}
              </p>
            </div>
          )}

          {/* Self-demotion warning */}
          {isSelf && selectedRole && selectedRole !== 'admin' && currentRole === 'admin' && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-200 text-sm text-yellow-700">
              <p className="font-medium">⚠️ Warning</p>
              <p>You cannot demote yourself from admin. Another admin must do this.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => selectedRole && updateRoleMutation.mutate({ userId: user.id, role: selectedRole })}
            disabled={
              !hasChanges ||
              updateRoleMutation.isPending ||
              (isSelf && currentRole === 'admin' && selectedRole !== 'admin')
            }
          >
            {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Role Badge Component
 * Displays a user's role with appropriate styling.
 */
export function RoleBadge({ role, size = "default" }: { role: string | null; size?: "sm" | "default" }) {
  const userRole = (role || 'member') as UserRole;
  const config = ROLE_CONFIG[userRole] || ROLE_CONFIG.member;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`${config.color} ${size === 'sm' ? 'text-xs py-0' : ''}`}
    >
      <Icon className={`${size === 'sm' ? 'h-3 w-3 mr-1' : 'h-3.5 w-3.5 mr-1.5'}`} />
      {config.label}
    </Badge>
  );
}

