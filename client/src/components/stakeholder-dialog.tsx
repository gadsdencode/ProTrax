import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, Plus, Trash2, Mail, Shield, Eye, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, ProjectStakeholder, InsertProjectStakeholder } from "@shared/schema";

interface StakeholderDialogProps {
  projectId: number;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleLabels = {
  sponsor: "Sponsor",
  reviewer: "Reviewer",
  observer: "Observer",
  team_member: "Team Member",
  client: "Client",
  vendor: "Vendor",
};

const roleIcons = {
  sponsor: Shield,
  reviewer: Eye,
  observer: Eye,
  team_member: UserPlus,
  client: Users,
  vendor: Users,
};

export function StakeholderDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
}: StakeholderDialogProps) {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<InsertProjectStakeholder["role"]>("observer");
  const [receiveEmailReports, setReceiveEmailReports] = useState(true);

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: open,
  });

  // Fetch current stakeholders
  const { data: stakeholders = [], isLoading: stakeholdersLoading } = useQuery<ProjectStakeholder[]>({
    queryKey: [`/api/projects/${projectId}/stakeholders`],
    enabled: open,
  });

  // Add stakeholder mutation
  const addMutation = useMutation({
    mutationFn: async (data: Omit<InsertProjectStakeholder, "projectId" | "addedBy">) => {
      return await apiRequest("POST", `/api/projects/${projectId}/stakeholders`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/stakeholders`] });
      setSelectedUserId("");
      setSelectedRole("observer");
      setReceiveEmailReports(true);
      toast({
        title: "Success",
        description: "Stakeholder added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove stakeholder mutation
  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/projects/${projectId}/stakeholders/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/stakeholders`] });
      toast({
        title: "Success",
        description: "Stakeholder removed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update stakeholder mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<InsertProjectStakeholder> }) => {
      return await apiRequest("PATCH", `/api/stakeholders/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/stakeholders`] });
      toast({
        title: "Success",
        description: "Stakeholder updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter out users who are already stakeholders
  const availableUsers = users.filter(
    user => !stakeholders.some(s => s.userId === user.id)
  );

  // Get user details for stakeholders
  const stakeholderWithDetails = stakeholders.map(stakeholder => {
    const user = users.find(u => u.id === stakeholder.userId);
    return {
      ...stakeholder,
      user,
    };
  });

  const handleAddStakeholder = () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user",
        variant: "destructive",
      });
      return;
    }

    addMutation.mutate({
      userId: selectedUserId,
      role: selectedRole,
      receiveEmailReports,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Stakeholders - {projectName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Stakeholder Form */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user">Add Stakeholder</Label>
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                    disabled={availableUsers.length === 0}
                  >
                    <SelectTrigger id="user" data-testid="select-stakeholder-user">
                      <SelectValue placeholder={
                        availableUsers.length === 0 
                          ? "All users are already stakeholders" 
                          : "Select a user"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}` 
                            : user.email || user.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={selectedRole || undefined}
                    onValueChange={(value) => setSelectedRole(value as InsertProjectStakeholder["role"])}
                  >
                    <SelectTrigger id="role" data-testid="select-stakeholder-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="reports">Receive Email Reports</Label>
                    <p className="text-xs text-muted-foreground">
                      Stakeholder will be included in email reports
                    </p>
                  </div>
                  <Switch
                    id="reports"
                    checked={receiveEmailReports}
                    onCheckedChange={setReceiveEmailReports}
                    data-testid="switch-receive-reports"
                  />
                </div>

                <Button 
                  onClick={handleAddStakeholder}
                  disabled={!selectedUserId || addMutation.isPending}
                  className="w-full"
                  data-testid="button-add-stakeholder"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stakeholder
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Stakeholders */}
          <div>
            <h3 className="text-sm font-medium mb-3">Current Stakeholders</h3>
            {stakeholdersLoading || usersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : stakeholderWithDetails.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No stakeholders added yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {stakeholderWithDetails.map(stakeholder => {
                  const RoleIcon = stakeholder.role ? roleIcons[stakeholder.role] : Users;
                  const userName = stakeholder.user
                    ? (stakeholder.user.firstName && stakeholder.user.lastName 
                      ? `${stakeholder.user.firstName} ${stakeholder.user.lastName}` 
                      : stakeholder.user.email || stakeholder.userId)
                    : stakeholder.userId;
                  
                  return (
                    <Card key={stakeholder.id} data-testid={`stakeholder-card-${stakeholder.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="font-medium">
                                {userName}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {stakeholder.role && (
                                  <Badge variant="secondary" className="text-xs">
                                    <RoleIcon className="h-3 w-3 mr-1" />
                                    {roleLabels[stakeholder.role]}
                                  </Badge>
                                )}
                                {stakeholder.receiveEmailReports && (
                                  <Badge variant="outline" className="text-xs">
                                    <Mail className="h-3 w-3 mr-1" />
                                    Receives Reports
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={stakeholder.receiveEmailReports || false}
                              onCheckedChange={(checked) => {
                                updateMutation.mutate({
                                  id: stakeholder.id,
                                  updates: { receiveEmailReports: checked },
                                });
                              }}
                              data-testid={`switch-reports-${stakeholder.id}`}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeMutation.mutate(stakeholder.userId)}
                              disabled={removeMutation.isPending}
                              data-testid={`button-remove-stakeholder-${stakeholder.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}