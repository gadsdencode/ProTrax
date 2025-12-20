/**
 * Onboarding Page
 * 
 * Shown to users who are authenticated but don't belong to any organization.
 * Provides options to:
 * - Create a new organization
 * - View and accept pending invitations
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Building2,
  Mail,
  Plus,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Users,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreateOrganizationDialog } from "@/components/create-organization-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, handleMutationError } from "@/lib/queryClient";
import { useOrganizationStore } from "@/stores/useOrganizationStore";

interface PendingInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  expiresAt: string;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
  };
}

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

export default function Onboarding() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const setCurrentOrganization = useOrganizationStore((state) => state.setCurrentOrganization);

  // Fetch pending invitations for the current user
  const { data: invitations = [], isLoading: loadingInvitations } = useQuery<PendingInvitation[]>({
    queryKey: ["/api/organizations/my-invitations"],
    enabled: !!user,
  });

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await apiRequest("POST", `/api/organizations/my-invitations/${invitationId}/accept`);
      return res.json();
    },
    onSuccess: (data) => {
      // Set the new organization as current
      setCurrentOrganization(data.organization, data.membership.role);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/my-invitations"] });
      
      toast({
        title: "Welcome!",
        description: `You've joined ${data.organization.name}`,
      });
      
      // Navigate to dashboard
      setLocation("/");
    },
    onError: handleMutationError,
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">ProTrax</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user?.username}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
              Welcome to ProTrax
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started by creating your organization or joining an existing one. 
              Organizations help you collaborate with your team and manage projects together.
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Create Organization Card */}
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Create an Organization</CardTitle>
                <CardDescription>
                  Start fresh with your own workspace. Perfect for new teams or personal projects.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Invite team members after setup</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Full admin access as the owner</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => setCreateOrgOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Organization
                </Button>
              </CardFooter>
            </Card>

            {/* Pending Invitations Card */}
            <Card className="relative overflow-hidden border-2">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-2">
                  <Mail className="h-6 w-6 text-blue-500" />
                </div>
                <CardTitle className="text-xl flex items-center gap-2">
                  Pending Invitations
                  {invitations.length > 0 && (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {invitations.length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {user?.email 
                    ? "Join an organization you've been invited to."
                    : "Add an email to your account to receive invitations."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingInvitations ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : invitations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No pending invitations</p>
                    {!user?.email && (
                      <p className="text-xs mt-1">Add an email to your profile to receive invitations</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {invitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {invitation.organization.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Join as <span className="font-medium">{roleLabels[invitation.role]}</span>
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => acceptInvitationMutation.mutate(invitation.id)}
                          disabled={acceptInvitationMutation.isPending}
                        >
                          {acceptInvitationMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              Join
                              <ArrowRight className="ml-1 h-3 w-3" />
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info Section */}
          <Separator />
          
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <h3 className="font-medium">Secure Multi-Tenancy</h3>
              <p className="text-sm text-muted-foreground">
                Your data is isolated and protected at the database level.
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <h3 className="font-medium">Team Collaboration</h3>
              <p className="text-sm text-muted-foreground">
                Invite team members and assign roles for better coordination.
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto">
                <Building2 className="h-5 w-5 text-orange-500" />
              </div>
              <h3 className="font-medium">Multiple Organizations</h3>
              <p className="text-sm text-muted-foreground">
                Join multiple organizations and switch between them easily.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Create Organization Dialog */}
      <CreateOrganizationDialog 
        open={createOrgOpen} 
        onOpenChange={setCreateOrgOpen} 
      />
    </div>
  );
}

