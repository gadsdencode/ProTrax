/**
 * Organization Members Dialog
 * 
 * A dialog for managing organization members:
 * - View all members
 * - Invite new members
 * - Change member roles
 * - Remove members
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Crown,
  Shield,
  User,
  Eye,
  UserPlus,
  MoreHorizontal,
  Loader2,
  Mail,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/use-organization";
import { apiRequest, queryClient, handleMutationError } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// Role configuration
const roleConfig = {
  owner: { icon: Crown, color: "text-amber-500", bgColor: "bg-amber-500/10", label: "Owner" },
  admin: { icon: Shield, color: "text-blue-500", bgColor: "bg-blue-500/10", label: "Admin" },
  member: { icon: User, color: "text-green-500", bgColor: "bg-green-500/10", label: "Member" },
  viewer: { icon: Eye, color: "text-gray-500", bgColor: "bg-gray-500/10", label: "Viewer" },
};

type Role = keyof typeof roleConfig;

interface Member {
  id: number;
  userId: string;
  role: Role;
  joinedAt: string | null;
  user: {
    id: string;
    username: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
}

interface OrganizationMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrganizationMembersDialog({
  open,
  onOpenChange,
}: OrganizationMembersDialogProps) {
  const { toast } = useToast();
  const { currentOrganization, isOwner, isAdmin, canManageMembers } = useOrganization();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");

  // Fetch members
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["/api/organizations", currentOrganization?.id, "members"],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const res = await apiRequest("GET", `/api/organizations/${currentOrganization.id}/members`);
      return res.json();
    },
    enabled: !!currentOrganization && open,
  });

  // Invite member mutation
  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: Role }) => {
      if (!currentOrganization) throw new Error("No organization selected");
      const res = await apiRequest(
        "POST",
        `/api/organizations/${currentOrganization.id}/invitations`,
        { email, role }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${inviteEmail}`,
      });
      setInviteEmail("");
      setInviteRole("member");
    },
    onError: handleMutationError,
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      if (!currentOrganization) throw new Error("No organization selected");
      const res = await apiRequest(
        "PATCH",
        `/api/organizations/${currentOrganization.id}/members/${userId}/role`,
        { role }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/organizations", currentOrganization?.id, "members"] 
      });
      toast({
        title: "Role updated",
        description: "Member role has been updated",
      });
    },
    onError: handleMutationError,
  });

  // Remove member mutation
  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!currentOrganization) throw new Error("No organization selected");
      await apiRequest(
        "DELETE",
        `/api/organizations/${currentOrganization.id}/members/${userId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/organizations", currentOrganization?.id, "members"] 
      });
      toast({
        title: "Member removed",
        description: "Member has been removed from the organization",
      });
    },
    onError: handleMutationError,
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  };

  const getMemberName = (member: Member) => {
    if (member.user.firstName && member.user.lastName) {
      return `${member.user.firstName} ${member.user.lastName}`;
    }
    return member.user.username || member.user.email || "Unknown";
  };

  const getMemberInitials = (member: Member) => {
    const name = getMemberName(member);
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Organization Members</DialogTitle>
          <DialogDescription>
            Manage members of {currentOrganization?.name}
          </DialogDescription>
        </DialogHeader>

        {/* Invite Section */}
        {canManageMembers && (
          <>
            <div className="space-y-3">
              <Label>Invite New Member</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="email@example.com"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={inviteMutation.isPending}
                />
                <Select
                  value={inviteRole}
                  onValueChange={(v) => setInviteRole(v as Role)}
                  disabled={inviteMutation.isPending}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isOwner && <SelectItem value="admin">Admin</SelectItem>}
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim() || inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Members List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No members found
            </p>
          ) : (
            members.map((member) => {
              const RoleIcon = roleConfig[member.role].icon;
              const canModify = canManageMembers && member.role !== "owner";

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={member.user.profileImageUrl || undefined}
                      alt={getMemberName(member)}
                    />
                    <AvatarFallback>{getMemberInitials(member)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {getMemberName(member)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.user.email}
                    </p>
                  </div>

                  <Badge
                    variant="secondary"
                    className={cn(
                      "flex items-center gap-1",
                      roleConfig[member.role].bgColor,
                      roleConfig[member.role].color
                    )}
                  >
                    <RoleIcon className="h-3 w-3" />
                    {roleConfig[member.role].label}
                  </Badge>

                  {canModify && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        {/* Role Change Options */}
                        {isOwner && member.role !== "admin" && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateRoleMutation.mutate({
                                userId: member.userId,
                                role: "admin",
                              })
                            }
                          >
                            <Shield className="h-4 w-4 mr-2 text-blue-500" />
                            Make Admin
                          </DropdownMenuItem>
                        )}
                        {member.role !== "member" && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateRoleMutation.mutate({
                                userId: member.userId,
                                role: "member",
                              })
                            }
                          >
                            <User className="h-4 w-4 mr-2 text-green-500" />
                            Make Member
                          </DropdownMenuItem>
                        )}
                        {member.role !== "viewer" && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateRoleMutation.mutate({
                                userId: member.userId,
                                role: "viewer",
                              })
                            }
                          >
                            <Eye className="h-4 w-4 mr-2 text-gray-500" />
                            Make Viewer
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => removeMutation.mutate(member.userId)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

