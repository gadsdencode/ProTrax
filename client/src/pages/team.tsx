import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Calendar, Users, UserPlus, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/empty-state";
import { RoleManagementDialog, RoleBadge, ROLE_CONFIG, type UserRole } from "@/components/role-management-dialog";
import { useAuth } from "@/hooks/use-auth";
import type { User } from "@shared/schema";

export default function Team() {
  const { user: currentUser } = useAuth();
  const [selectedUser, setSelectedUser] = useState<Omit<User, 'password'> | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';

  // Remove passwords from user objects for safety
  const sanitizedUsers = users?.map(({ password, ...user }) => user);

  // Calculate role stats
  const roleStats = sanitizedUsers?.reduce((acc, user) => {
    const role = (user.role || 'member') as UserRole;
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<UserRole, number>);

  const handleManageRole = (user: Omit<User, 'password'>) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-team-title">Team</h1>
          <p className="text-muted-foreground">Manage team members and workload</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground mr-4">
              <Shield className="h-4 w-4 text-primary" />
              <span>Admin Mode</span>
            </div>
          )}
          {users && users.length > 0 && (
            <Button data-testid="button-invite-member">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>
      </div>

      {/* Role Stats - Only show for admins */}
      {isAdmin && roleStats && Object.keys(roleStats).length > 0 && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {(Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => {
            const config = ROLE_CONFIG[role];
            const Icon = config.icon;
            const count = roleStats[role] || 0;
            return (
              <Card key={role} className="p-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{config.label}s</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !sanitizedUsers || sanitizedUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Start collaborating by inviting team members to join your workspace."
          action={{
            label: "Invite Your First Member",
            onClick: () => {
              // This would typically open an invite dialog
              console.log("Invite member clicked");
            }
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sanitizedUsers.map(user => {
            const isSelf = user.id === currentUser?.id;
            
            return (
              <Card 
                key={user.id} 
                className={`hover-elevate transition-all ${isSelf ? 'ring-2 ring-primary/20' : ''}`}
                data-testid={`team-member-${user.id}`}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.profileImageUrl || undefined} style={{ objectFit: 'cover' }} />
                      <AvatarFallback>
                        {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate flex items-center gap-2">
                        {user.firstName} {user.lastName}
                        {isSelf && (
                          <span className="text-xs text-muted-foreground font-normal">(you)</span>
                        )}
                      </CardTitle>
                      {user.email && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Admin actions dropdown */}
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleManageRole(user)}>
                            <Shield className="h-4 w-4 mr-2" />
                            Manage Role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            disabled={isSelf}
                          >
                            Remove User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Role Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Role</span>
                    <RoleBadge role={user.role} size="sm" />
                  </div>
                  
                  {/* Capacity */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="font-medium">{user.weeklyCapacity || 40}h/week</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Available
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Role Management Dialog */}
      <RoleManagementDialog
        user={selectedUser}
        currentUserId={currentUser?.id || ''}
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
      />
    </div>
  );
}
